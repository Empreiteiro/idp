export const STATUS_LABELS: Record<string, string> = {
  uploaded: "Uploaded", ocr_processing: "Processing OCR", ocr_complete: "OCR Complete",
  classifying: "Classifying", extracting: "Extracting", completed: "Completed",
  review: "Needs Review", failed: "Failed",
};
export const STATUS_COLORS: Record<string, string> = {
  uploaded: "bg-gray-100 text-gray-700", ocr_processing: "bg-blue-100 text-blue-700",
  ocr_complete: "bg-blue-100 text-blue-700", classifying: "bg-purple-100 text-purple-700",
  extracting: "bg-indigo-100 text-indigo-700", completed: "bg-green-100 text-green-700",
  review: "bg-amber-100 text-amber-700", failed: "bg-red-100 text-red-700",
};
