"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";

type Props = { onCapture: (file: File) => void; disabled?: boolean };

/** Camera-first capture with a normal file picker fallback for unsupported browsers. */
export function CameraCapture({ onCapture, disabled = false }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!cameraOpen) return;
    let active = true;
    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera capture is not supported by this browser.");
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        if (!active) { stream.getTracks().forEach(track => track.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (cause) {
        setMessage(cause instanceof Error ? `${cause.message} Use the file picker instead.` : "Camera permission was not granted. Use the file picker instead.");
        setCameraOpen(false);
      }
    }
    start();
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    };
  }, [cameraOpen]);

  function capturePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setMessage("The camera is still starting. Please try again in a moment."); return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) { setMessage("Unable to capture a photo from this camera."); return; }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      if (!blob) { setMessage("Unable to create the photo file. Please try again."); return; }
      onCapture(new File([blob], `waste-site-${Date.now()}.jpg`, { type: "image/jpeg" }));
      setMessage("Photo captured and ready to submit.");
      setCameraOpen(false);
    }, "image/jpeg", 0.9);
  }

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    onCapture(file);
    setMessage("Photo selected and ready to submit.");
  }

  return <div className="space-y-3">
    {!cameraOpen ? <button type="button" className="btn-primary" disabled={disabled} onClick={() => { setMessage(""); setCameraOpen(true); }}>📷 Open environment camera</button> : <div className="overflow-hidden rounded-xl border border-slate-300 bg-slate-950 p-3">
      <video ref={videoRef} className="max-h-80 w-full rounded-lg bg-black object-contain" autoPlay muted playsInline />
      <div className="mt-3 flex flex-wrap gap-2"><button type="button" className="btn-primary" onClick={capturePhoto}>Capture photo</button><button type="button" className="btn-secondary" onClick={() => setCameraOpen(false)}>Cancel camera</button></div>
    </div>}
    <div><label className="field-label" htmlFor="photo-file">Or choose an existing photo</label><input id="photo-file" className="field" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" disabled={disabled} onChange={chooseFile} /></div>
    {message && <p className="field-help">{message}</p>}
  </div>;
}
