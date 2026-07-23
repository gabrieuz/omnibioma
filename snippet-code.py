"""Exemplo mínimo atualizado; a implementação reutilizável está em examples/."""
from examples.analyze_image import analyze

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("image")
    parser.add_argument("report")
    args = parser.parse_args()
    print(analyze(args.image, args.report))
