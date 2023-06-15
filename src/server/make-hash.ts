import crypto from 'crypto';

export const getImageHash = (obj: unknown): string => {
	return crypto.createHash('md5').update(JSON.stringify(obj)).digest('hex');
};

export const createHashFromeFile = (file: Buffer): string => {
  return crypto.createHash('md5').update(file).digest('hex');
}
