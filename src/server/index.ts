import {bundle} from '@remotion/bundler';
import {getCompositions, renderMedia, renderStill} from '@remotion/renderer';
import dotenv from 'dotenv';
import express from 'express';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {getFromCache, isInCache, saveToCache} from './cache';
import {handler} from './handler';
import {helpText} from './help-text';
import {getImageType, getMimeType} from './image-types';
import {createHashFromeFile, getImageHash} from './make-hash';
import {sendFile} from './send-file';
import multer from 'multer';

dotenv.config();

const app = express();
const port = process.env.PORT || 8000;

const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, 'uploads/')
	},
	filename: function (req, file, cb) {
		cb(null, Date.now() + path.extname(file.originalname))
	}
});
const upload = multer({ storage });

const webpackBundling = bundle(path.join(process.cwd(), 'src/index.ts'));
const tmpDir = fs.promises.mkdtemp(path.join(os.tmpdir(), 'remotion-'));

enum Params {
	compositionname,
	format,
}

const getComp = async (compName: string, inputProps: unknown) => {
	const comps = await getCompositions(await webpackBundling, {
		inputProps: inputProps as object,
	});

	const comp = comps.find((c) => c.id === compName);
	if (!comp) {
		throw new Error(`No composition called ${compName}`);
	}

	return comp;
};

// This setting will reveal the real IP address of the user, so we can apply rate limiting.
app.set('trust proxy', 1);

app.use('/static', express.static('uploads'));

// Not more than 20 requests per minute per user
app.use(
	rateLimit({
		windowMs: 1 * 60 * 1000,
		max: 20,
	})
);

// The video is rendered when /[CompositionName].mp4 is called.
// Props are passed via querystring and multipart form data.
app.post(`/:${Params.compositionname}.mp4`, upload.single('image'), handler(async (req, res) => {
  const inputProps = req.query;
  const compName = req.params[Params.compositionname];
  const videoFormat = 'mp4';
  const uploadedImage = req.file;

  if(!uploadedImage) {
    throw new Error('No image uploaded');
  }

  const imageBuffer = fs.readFileSync(uploadedImage.path);
  const imageHash = createHashFromeFile(imageBuffer);
  
  res.set('content-type', 'video/mp4');

  // Calculate a unique identifier for our video,
  // if it exists, return it from cache
  const hash = getImageHash(
    JSON.stringify({
      compName,
      videoFormat,
      inputProps,
      imageHash,
    })
  );

  // Join the uploaded image with the input props
  const inputPropsWithImage = Object.assign({}, inputProps, {
    images: uploadedImage.filename
  });

  if (await isInCache(hash)) {
    const file = await getFromCache(hash);
    return sendFile(res, file);
  }

  const output = path.join(await tmpDir, hash, '.mp4');
  const webpackBundle = await webpackBundling;
  const composition = await getComp(compName, inputProps);

  await renderMedia({
    composition,
    serveUrl: webpackBundle,
    codec: 'h264',
    outputLocation: output,
    inputProps: inputPropsWithImage,
  })

  await sendFile(res, fs.createReadStream(output));
  await saveToCache(hash, await fs.promises.readFile(output));
  await fs.promises.unlink(output);
	await fs.promises.unlink(uploadedImage.path)
}));

// The image is rendered when /[CompositionName].[imageformat] is called.
// Props are passed via query string.
app.get(
	`/:${Params.compositionname}.:${Params.format}(png|jpe?g)`,
	handler(async (req, res) => {
		const inputProps = req.query;
		const compName = req.params[Params.compositionname];
		const imageFormat = getImageType(req.params[Params.format]);

		res.set('content-type', getMimeType(imageFormat));

		// Calculate a unique identifier for our image,
		// if it exists, return it from cache
		const hash = getImageHash(
			JSON.stringify({
				compName,
				imageFormat,
				inputProps,
			})
		);

		if (await isInCache(hash)) {
			const file = await getFromCache(hash);
			return sendFile(res, file);
		}

		const output = path.join(await tmpDir, hash);

		const webpackBundle = await webpackBundling;
		const composition = await getComp(compName, inputProps);
		await renderStill({
			composition,
			serveUrl: webpackBundle,
			output,
			inputProps,
			imageFormat,
		});

		await sendFile(res, fs.createReadStream(output));
		await saveToCache(hash, await fs.promises.readFile(output));
		await fs.promises.unlink(output);
	})
);

app.listen(port);
console.log(helpText(Number(port)));
