import Image from "next/image";
import Appbar from "@/components/Appbar";
import { UploadImage } from "@/components/UploadImage";
import { Upload } from "@/components/Upload";
import { Hero } from "@/components/Hero";
export default function Home() {
  return (
    <main>
      <Appbar />
      <Hero />
      <Upload />
    </main>
  );
}
