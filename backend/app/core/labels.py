import unicodedata


def canonical_label(value: str | None) -> str:
    text = unicodedata.normalize("NFC", value or "").replace("Ð", "Đ").replace("ð", "đ")
    return " ".join(text.split())
