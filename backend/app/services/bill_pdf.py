from __future__ import annotations


def format_bill_no(bill_no: int | str) -> str:
    if isinstance(bill_no, str):
        return bill_no.zfill(4) if bill_no.isdigit() else bill_no
    return str(bill_no).zfill(4)


def render_bill_pdf(
    *,
    bill_no: int | str,
    student_name: str,
    student_code: str,
    fee_period: str,
    amount: str,
    payment_date: str,
    next_due: str,
    pending: str,
    remarks: str,
) -> bytes:
    def esc(value: str) -> str:
        return value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")

    lines = [
        ("F2", 22, 210, 760, "MYACADEMY"),
        ("F1", 12, 226, 740, "gain more knowledge"),
        ("F1", 10, 50, 720, "Regd.No - 469/2016"),
        ("F1", 11, 50, 680, f"ROLL NO : {student_code}"),
        ("F1", 11, 330, 680, f"DATE : {payment_date}"),
        ("F1", 11, 50, 650, f"BILL NO (0001 - 4000) : {format_bill_no(bill_no)}"),
        ("F1", 11, 330, 650, f"NEXT DUE : {next_due}"),
        ("F1", 11, 50, 620, f"PENDING : {pending}"),
        ("F1", 11, 330, 620, f"AMOUNT PAID : {amount}"),
        ("F1", 11, 50, 590, f"STUDENT : {student_name}"),
        ("F1", 11, 50, 560, f"FEE PERIOD : {fee_period}"),
        ("F1", 11, 50, 520, f"REMARKS : {remarks}"),
    ]
    content = [
        "0.2 w",
        "36 500 540 280 re S",
        "36 700 540 0 re S",
        "36 605 540 0 re S",
        "306 605 0 95 re S",
        "BT",
    ]
    for font, size, x, y, text in lines:
        content.append(f"/{font} {size} Tf")
        content.append(f"1 0 0 1 {x} {y} Tm")
        content.append(f"({esc(text)}) Tj")
    content.append("ET")
    stream = "\n".join(content).encode("ascii")
    objects: list[bytes] = []
    objects.append(b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n")
    objects.append(b"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n")
    objects.append(
        b"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
        b"/Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >> endobj\n"
    )
    objects.append(b"4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n")
    objects.append(b"5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj\n")
    objects.append(f"6 0 obj << /Length {len(stream)} >> stream\n".encode("ascii") + stream + b"\nendstream endobj\n")

    pdf = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for obj in objects:
        offsets.append(len(pdf))
        pdf.extend(obj)
    xref_start = len(pdf)
    pdf.extend(f"xref\n0 {len(offsets)}\n".encode("ascii"))
    pdf.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode("ascii"))
    pdf.extend(
        f"trailer << /Size {len(offsets)} /Root 1 0 R >>\nstartxref\n{xref_start}\n%%EOF".encode("ascii")
    )
    return bytes(pdf)


def render_custom_bill_pdf(*, fields: list[tuple[str, str]]) -> bytes:
    def esc(value: str) -> str:
        return value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")

    y = 700
    lines = [
        ("F2", 22, 210, 760, "MYACADEMY"),
        ("F1", 12, 226, 740, "gain more knowledge"),
        ("F1", 10, 50, 720, "Regd.No - 469/2016"),
    ]
    for label, value in fields:
        lines.append(("F1", 11, 50, y, f"{label} : {value}"))
        y -= 30

    bottom = max(120, y - 20)
    content = [
        "0.2 w",
        f"36 {bottom} 540 {740 - bottom} re S",
        "BT",
    ]
    for font, size, x, y_pos, text in lines:
        content.append(f"/{font} {size} Tf")
        content.append(f"1 0 0 1 {x} {y_pos} Tm")
        content.append(f"({esc(text)}) Tj")
    content.append("ET")
    stream = "\n".join(content).encode("ascii")
    objects: list[bytes] = []
    objects.append(b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n")
    objects.append(b"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n")
    objects.append(
        b"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
        b"/Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >> endobj\n"
    )
    objects.append(b"4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n")
    objects.append(b"5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj\n")
    objects.append(f"6 0 obj << /Length {len(stream)} >> stream\n".encode("ascii") + stream + b"\nendstream endobj\n")

    pdf = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for obj in objects:
        offsets.append(len(pdf))
        pdf.extend(obj)
    xref_start = len(pdf)
    pdf.extend(f"xref\n0 {len(offsets)}\n".encode("ascii"))
    pdf.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode("ascii"))
    pdf.extend(
        f"trailer << /Size {len(offsets)} /Root 1 0 R >>\nstartxref\n{xref_start}\n%%EOF".encode("ascii")
    )
    return bytes(pdf)
