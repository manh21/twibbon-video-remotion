import { useCallback, useEffect, useRef } from "react";
import { AbsoluteFill, Img, Video, staticFile, useVideoConfig } from "remotion";

export const Twibbon: React.FC<{
  images: string
}> = ({
  images
}) => {
  const video = useRef<HTMLVideoElement>(null);
  const image = useRef<HTMLImageElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const { width, height } = useVideoConfig();

  const myImage = `http://localhost:8000/static/${images}`;

  // const image = new Image();
  // image.src = staticFile(images.filename);  

  // Process a frame
  const onVideoFrame = useCallback(() => {
    if (!canvas.current || !video.current || !image.current) return;

    const context = canvas.current.getContext("2d");
    if (!context) return;

    // Clear previous frame
    context.clearRect(0, 0, width, height)

    // Draw Image
    context.drawImage(image.current, 0, 0, width, height);

    // Draw Video Frame
    context.drawImage(video.current, 0, 0, width, height);
  }, [height, width]);

  // Synchronize the video with the canvas
  useEffect(() => {
    const { current } = video;
    if (!current?.requestVideoFrameCallback) {
      return;
    }

    let handle = 0;
    const callback = () => {
      onVideoFrame();
      handle = current.requestVideoFrameCallback(callback);
    };

    callback();

    return () => {
      current.cancelVideoFrameCallback(handle);
    };
  }, [onVideoFrame]);

  return (
    <AbsoluteFill>
      <AbsoluteFill>
        <Video
          ref={video}
          // Hide the original video tag
          style={{ opacity: 0 }}
          startFrom={0}
          src={staticFile("twibbon.webm")}
        />
        <Img 
          ref={image}
          style={{ opacity: 0 }}
          src={myImage}
          width="1080px"
          onError={(e) => console.log(e)}
        />
      </AbsoluteFill>
      <AbsoluteFill>
        <canvas ref={canvas} width={width} height={height} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};