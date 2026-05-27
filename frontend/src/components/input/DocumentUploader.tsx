"use client";

import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, FileText, Image, File } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DocumentUploaderProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  maxSizeMB?: number;
}

const FILE_ICONS: Record<string, typeof FileText> = {
  pdf: FileText,
  docx: FileText,
  png: Image,
  jpg: Image,
  jpeg: Image,
};

function getFileIcon(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return FILE_ICONS[ext] || File;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

export function DocumentUploader({ files, onFilesChange, maxSizeMB = 50 }: DocumentUploaderProps) {
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      setError(null);

      if (rejectedFiles.length > 0) {
        setError(rejectedFiles[0].errors[0]?.message || "Invalid file");
        return;
      }

      const oversized = acceptedFiles.filter((f) => f.size > maxSizeMB * 1024 * 1024);
      if (oversized.length > 0) {
        setError(`File "${oversized[0].name}" exceeds ${maxSizeMB}MB limit`);
        return;
      }

      onFilesChange([...files, ...acceptedFiles]);
    },
    [files, onFilesChange, maxSizeMB]
  );

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
    },
    maxSize: maxSizeMB * 1024 * 1024,
  });

  return (
    <div className="space-y-4">
      <div {...getRootProps()} className="focus:outline-none">
        <input {...getInputProps()} />
        <motion.div
          className={`relative rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-300 ${
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 bg-background"
          }`}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
        <motion.div
          animate={isDragActive ? { y: -5 } : { y: 0 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col items-center gap-3"
        >
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
            <Upload className={`w-7 h-7 ${isDragActive ? "text-primary" : "text-muted-foreground"}`} />
          </div>
          <div>
            <p className="font-medium">
              {isDragActive ? "Drop your files here" : "Drag & drop files here"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              or click to browse • PDF, DOCX, PNG, JPG • Max {maxSizeMB}MB
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-destructive"
        >
          {error}
        </motion.p>
      )}

      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            {files.map((file, index) => {
              const Icon = getFileIcon(file.name);
              return (
                <motion.div
                  key={`${file.name}-${index}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-3 rounded-xl bg-background border border-border p-3 group"
                >
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 hover:bg-destructive/20 hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(index);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
