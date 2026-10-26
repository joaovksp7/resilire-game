"""
Compara dois exports do Instagram e mostra quem parou de te seguir
e quem começou a seguir entre um e outro.

Uso:
    python comparar_seguidores.py <export_antigo> <export_novo>

Cada export pode ser o .zip que o Instagram manda, a pasta extraída
ou o próprio arquivo followers_1.json.
"""

import json
import sys
import zipfile
from pathlib import Path


def usuario_do_item(item):
    """Tira o @ de um item do JSON (o formato muda entre versões do export)."""
    nomes = set()
    for d in item.get("string_list_data", []):
        if d.get("value"):
            nomes.add(d["value"])
        elif d.get("href"):
            nomes.add(d["href"].rstrip("/").split("/")[-1])
    if not nomes and item.get("title"):
        nomes.add(item["title"])
    return {n.strip().lower().lstrip("@") for n in nomes if n.strip()}


def extrair_usuarios(dados):
    usuarios = set()
    if isinstance(dados, dict):
        # alguns exports embrulham a lista numa chave
        for v in dados.values():
            if isinstance(v, list):
                dados = v
                break
    for item in dados if isinstance(dados, list) else []:
        usuarios |= usuario_do_item(item)
    return usuarios


def eh_arquivo_seguidores(nome):
    nome = Path(nome).name
    return nome.startswith("followers") and nome.endswith(".json")


def carregar(caminho):
    p = Path(caminho)
    usuarios = set()

    if p.suffix == ".zip":
        with zipfile.ZipFile(p) as z:
            arquivos = [n for n in z.namelist() if eh_arquivo_seguidores(n)]
            for n in arquivos:
                usuarios |= extrair_usuarios(json.loads(z.read(n).decode("utf-8")))
    elif p.is_dir():
        arquivos = [f for f in p.rglob("*.json") if eh_arquivo_seguidores(f)]
        for f in arquivos:
            usuarios |= extrair_usuarios(json.loads(f.read_text(encoding="utf-8")))
    else:
        arquivos = [p]
        usuarios = extrair_usuarios(json.loads(p.read_text(encoding="utf-8")))

    if not arquivos:
        sys.exit(f"Não achei followers*.json em {caminho}. Confere se pediu o export em JSON.")
    return usuarios


def main():
    if len(sys.argv) != 3:
        sys.exit("Uso: python comparar_seguidores.py <export_antigo> <export_novo>")

    antigo = carregar(sys.argv[1])
    novo = carregar(sys.argv[2])

    sairam = sorted(antigo - novo)
    entraram = sorted(novo - antigo)

    print(f"Seguidores antes: {len(antigo)}  |  agora: {len(novo)}\n")

    print(f"Pararam de seguir ({len(sairam)}):")
    for u in sairam:
        print(f"  @{u}  ->  https://instagram.com/{u}")

    print(f"\nComeçaram a seguir ({len(entraram)}):")
    for u in entraram:
        print(f"  @{u}")


if __name__ == "__main__":
    main()
