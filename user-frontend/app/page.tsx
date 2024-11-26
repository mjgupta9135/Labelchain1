import Image from "next/image";
import Appbar from "@/components/Appbar";
import { UploadImage } from "@/components/UploadImage";
export default function Home() {
  return (
    <main>
      <Appbar />
      <UploadImage />
    </main>
  );
}
