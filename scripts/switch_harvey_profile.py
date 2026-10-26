import sys
import shutil
from pathlib import Path

HARVEY_DIR = Path(r"C:\Users\Agencia FMD\Downloads\HARNEY\harvey")
LOCAL_YAML = HARVEY_DIR / "harvey.local.yaml"
FMD_YAML = HARVEY_DIR / "harvey.fmd.yaml"
ITAPOA_YAML = HARVEY_DIR / "harvey.itapoa.yaml"

def switch(target: str):
    target = target.lower().strip()
    if target in ["itapoa", "itapoá", "guia"]:
        if not ITAPOA_YAML.exists():
            print("Erro: harvey.itapoa.yaml não encontrado.")
            return False
        shutil.copyfile(ITAPOA_YAML, LOCAL_YAML)
        print(">> Perfil ativo alternado com sucesso para: [Guia de Itapoá / Itapoá Online]")
        return True
    elif target in ["fmd", "agenciafmd", "agencia"]:
        if not FMD_YAML.exists():
            print("Erro: harvey.fmd.yaml não encontrado.")
            return False
        shutil.copyfile(FMD_YAML, LOCAL_YAML)
        print(">> Perfil ativo alternado com sucesso para: [Agência FMD]")
        return True
    else:
        print(f"Uso: python switch_profile.py [itapoa | fmd]")
        return False

if __name__ == "__main__":
    if len(sys.argv) > 1:
        switch(sys.argv[1])
    else:
        print("Informe o perfil desejado: python switch_profile.py [itapoa | fmd]")
