import QRCode from "qrcode";

const QR_SIZE = 400;
const QR_MARGIN = 2;
const QR_DARK = "#e2e8f0";
const QR_LIGHT = "#0f172a";

export async function generateQrCodeDataUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("QR content cannot be empty");
  }

  return QRCode.toDataURL(trimmed, {
    type: "image/png",
    errorCorrectionLevel: "M",
    width: QR_SIZE,
    margin: QR_MARGIN,
    color: {
      dark: QR_DARK,
      light: QR_LIGHT,
    },
  });
}
