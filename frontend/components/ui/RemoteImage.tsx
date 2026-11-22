import Image, { type ImageProps } from "next/image";

export default function RemoteImage(props: ImageProps) {
  const src = typeof props.src === "string" ? props.src : "";
  // pictures from the local backend skip the optimizer (Cloudinary will take over later)
  return <Image {...props} unoptimized={src.startsWith("http://localhost")} />;
}