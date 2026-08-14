import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

const FONT_URL =
    "https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-Regular.ttf";
const FONT_BOLD_URL =
    "https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-Bold.ttf";

export async function buildDigestPdf(title: string, lines: string[]): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    doc.registerFontkit(fontkit);

    const [fontBytes, fontBoldBytes] = await Promise.all([
        fetch(FONT_URL).then((r) => r.arrayBuffer()),
        fetch(FONT_BOLD_URL).then((r) => r.arrayBuffer()),
    ]);
    const font = await doc.embedFont(fontBytes, { subset: true });
    const fontBold = await doc.embedFont(fontBoldBytes, { subset: true });

    let page = doc.addPage([595, 842]);
    let y = 790;

    page.drawText(title, { x: 50, y, size: 20, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
    y -= 45;

    for (const rawLine of lines) {
        if (y < 60) {
            page = doc.addPage([595, 842]);
            y = 790;
        }
        const isBullet = rawLine.startsWith("•");
        const useFont = rawLine.endsWith(":") ? fontBold : font;
        page.drawText(rawLine, {
            x: isBullet ? 65 : 50,
            y,
            size: 12,
            font: useFont,
            color: rgb(0.15, 0.15, 0.15),
        });
        y -= 20;
    }

    return doc.save();
}