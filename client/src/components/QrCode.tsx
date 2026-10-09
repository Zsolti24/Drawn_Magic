import { useCallback, useMemo } from "react";
import QRCode from "qrcode";
import { drawQr } from "../draw/shapes";
import { DrawnCanvas } from "./DrawnCanvas";

/** QR-kód: a könyvtár csak a négyzetrácsot adja, a kirajzolás a miénk */
export function QrCode({ value, size }: { value: string; size: number }) {
  const qr = useMemo(() => {
    const { modules } = QRCode.create(value, { errorCorrectionLevel: "M" });
    return { count: modules.size, data: Array.from(modules.data, Boolean) };
  }, [value]);

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, w: number) => drawQr(ctx, qr.data, qr.count, w),
    [qr],
  );
  return <DrawnCanvas width={size} height={size} draw={draw} label="QR-kód a csatlakozáshoz" />;
}
