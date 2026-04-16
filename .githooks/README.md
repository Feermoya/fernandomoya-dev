# Hooks de Git (solo este repositorio)

Los scripts están en esta carpeta y se versionan con el proyecto. Git no los usa hasta que indiques la ruta de hooks.

## Activar (una vez por clon)

Desde la raíz del repositorio:

```bash
git config core.hooksPath .githooks
```

Comprueba que el hook sea ejecutable (en macOS/Linux):

```bash
chmod +x .githooks/pre-commit
```

## Identidad local obligatoria

Este repo espera commits con:

- `user.name` = `feermoya`
- `user.email` = `fmoya97.fm@gmail.com`

Configúralo solo en este repo:

```bash
git config user.name "feermoya"
git config user.email "fmoya97.fm@gmail.com"
```

El hook `pre-commit` cancela el commit si el nombre o el correo efectivos no coinciden (evita usar otra identidad global por error).
