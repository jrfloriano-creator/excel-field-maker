# Windows SmartScreen — Guia Completo

## O que é o SmartScreen?

O **Windows SmartScreen** é um recurso de segurança integrado ao Windows Defender que analisa arquivos baixados da internet antes de permitir sua execução. Ele mantém um banco de dados de reputação de arquivos e, quando um executável não possui histórico de downloads suficiente ou não está assinado digitalmente por um certificado reconhecido, exibe um aviso bloqueando a execução.

A mensagem típica é:

> **"O Windows protegeu seu computador"**
> O Windows impediu a inicialização de um aplicativo desconhecido. A execução desse aplicativo pode colocar seu computador em risco.

---

## Por que o aviso aparece neste aplicativo?

O aviso aparece porque o instalador/executável **não possui um Certificado de Assinatura de Código (Code Signing Certificate)** emitido por uma Autoridade Certificadora (CA) reconhecida pela Microsoft.

Sem esse certificado:

- O Windows não consegue verificar a identidade do editor do software.
- O SmartScreen classifica o arquivo como "desconhecido" e emite o aviso preventivamente.
- Isso não significa que o software seja malicioso — apenas que não foi assinado digitalmente.

---

## Como resolver definitivamente: Certificados de Assinatura de Código

Para eliminar o aviso do SmartScreen é necessário adquirir um certificado de assinatura de código. Existem dois tipos principais:

### OV — Organization Validation (Validacao de Organizacao)

| Caracteristica        | Detalhe                                                   |
|-----------------------|-----------------------------------------------------------|
| Custo estimado        | ~USD 200-400 / ano                                        |
| Validacao             | Verifica a existencia legal da empresa/pessoa juridica    |
| Confianca SmartScreen | Reduz avisos, mas pode exigir downloads acumulados para reputacao completa |
| Armazenamento         | Arquivo `.pfx` / token USB                               |

### EV — Extended Validation (Validacao Estendida)

| Caracteristica        | Detalhe                                                   |
|-----------------------|-----------------------------------------------------------|
| Custo estimado        | ~USD 400-600 / ano                                        |
| Validacao             | Processo mais rigoroso; verifica identidade fisica        |
| Confianca SmartScreen | **Confianca imediata** — elimina o aviso do SmartScreen desde o primeiro download |
| Armazenamento         | Obrigatoriamente em token USB fisico (HSM)                |

> **Recomendacao:** Para distribuicao publica de software, o certificado **EV** e o ideal pois concede reputacao imediata junto ao SmartScreen, sem necessidade de acumulo de downloads.

### Fornecedores recomendados

| Fornecedor   | Site                        | Observacoes                              |
|--------------|-----------------------------|------------------------------------------|
| DigiCert     | https://www.digicert.com    | Lider de mercado, suporte premium        |
| Sectigo      | https://sectigo.com         | Boa relacao custo-beneficio              |
| GlobalSign   | https://www.globalsign.com  | Reconhecida globalmente, opcao empresarial |

---

## Configuracao no Tauri para Assinatura de Codigo

Apos adquirir o certificado (arquivo `.pfx`), configure a assinatura no `tauri.conf.json`:

```json
{
  "bundle": {
    "windows": {
      "certificateThumbprint": "SEU_THUMBPRINT_AQUI",
      "digestAlgorithm": "sha256",
      "timestampUrl": "http://timestamp.digicert.com"
    }
  }
}
```

### Parametros explicados

| Parametro               | Descricao                                                                              |
|-------------------------|----------------------------------------------------------------------------------------|
| `certificateThumbprint` | Hash SHA-1 do certificado instalado no Windows Certificate Store (sem espacos)        |
| `digestAlgorithm`       | Algoritmo de hash para a assinatura — use sempre `"sha256"`                           |
| `timestampUrl`          | URL do servidor de carimbo de tempo (timestamp) da CA — garante validade pos-expiracao |

### Como obter o Thumbprint do certificado

1. Instale o certificado `.pfx` no Windows (duplo clique e siga o assistente).
2. Abra o PowerShell como administrador e execute:

```powershell
Get-ChildItem -Path Cert:\CurrentUser\My | Select-Object Thumbprint, Subject
```

3. Copie o valor de `Thumbprint` correspondente ao seu certificado.
4. Cole no campo `certificateThumbprint` do `tauri.conf.json` (remova espacos, se houver).

### Variavel de ambiente para a senha do certificado

Nunca armazene a senha do `.pfx` diretamente no codigo. Use variavel de ambiente:

```powershell
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = "sua_senha_aqui"
```

No CI/CD (GitHub Actions, por exemplo), configure como secret do repositorio.

---

## Solucao Temporaria para Usuarios

Enquanto o certificado nao e adquirido, os usuarios podem executar o aplicativo manualmente contornando o aviso do SmartScreen:

### Passo a passo

1. Execute o instalador (`.exe` ou `.msi`).
2. O aviso do SmartScreen aparecera com a mensagem *"O Windows protegeu seu computador"*.
3. Clique em **"Mais informacoes"** (link azul abaixo da mensagem).
4. Aparecera o nome do arquivo e o editor. Clique em **"Executar assim mesmo"**.
5. O instalador prosseguira normalmente.

> **Importante:** Certifique-se de ter baixado o arquivo de uma fonte confiavel (site oficial ou repositorio verificado) antes de prosseguir com esta etapa.

---

## Resumo

| Situacao                          | Solucao                                              |
|-----------------------------------|------------------------------------------------------|
| Desenvolvimento / uso interno     | Contornar via "Mais informacoes" e "Executar assim mesmo" |
| Distribuicao publica (pequeno porte) | Certificado OV (~USD 200-400/ano)                |
| Distribuicao publica (sem avisos) | Certificado EV (~USD 400-600/ano) — confianca imediata |
