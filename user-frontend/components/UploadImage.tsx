"use client";

import axios from "axios";
import { useState, useEffect } from "react";

const BACKEND_URL = "http://localhost:3000";
const CLOUDFRONT_URL = "https://dbkhboglmtld2.cloudfront.net";

export function UploadImage({
  onImageAdded,
  image,
}: {
  onImageAdded: (image: string) => void;
  image?: string;
}) {
  const [uploading, setUploading] = useState(false);

  async function onFileSelect(e: any) {
    setUploading(true);
    try {
      const file = e.target.files[0];
      if (!file) throw new Error("No file selected");

      const token = localStorage.getItem("token");
      if (!token) throw new Error("User not authenticated");

      const response = await axios.get(`${BACKEND_URL}/v1/user/presignedUrl`, {
        headers: { Authorization: token },
      });

      const { preSignedUrl, fields } = response.data;
      const formData = new FormData();
      Object.entries(fields).forEach(([key, value]) => {
        formData.set(key, value);
      });
      formData.append("file", file);

      await axios.post(preSignedUrl, formData);

      const uploadedImageUrl = `${CLOUDFRONT_URL}/${fields["key"]}`;
      onImageAdded(uploadedImageUrl);
    } catch (e) {
      console.error("Upload failed:", e);
      alert("An error occurred during upload. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  // Ensure no `setState` is called directly in the render phase
  useEffect(() => {
    if (image) {
      console.log("Image updated:", image);
    }
  }, [image]);

  if (uploading) {
    return <div className="text-sm">Loading...</div>;
  }

  return image ? (
    <img className="p-2 w-60 h-50 rounded border m-4" src={image} />
  ) : (
    <div className="w-40 h-40 rounded border-black border text-2xl text-center pt-16 text-black cursor-pointer relative">
      +
      <input
        type="file"
        onChange={onFileSelect}
        style={{
          position: "absolute",
          opacity: 0,
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          width: "100%",
          height: "100%",
        }}
      />
    </div>
  );
}
