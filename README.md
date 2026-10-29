# Zera LPs — B2B

Duas landing pages B2B da Zera Brasil Químicos, servidas no mesmo dominio zerabrasil.com.br:

- `/caixa-de-gordura` — tratamento de caixa de gordura (restaurantes, condominios, industrias)
- `/tratamento-de-agua` — tratamento de agua (industrial, caldeiras, torres, predial)

Captura empresas interessadas e encaminha os leads pra planilha de backup via Apps Script, e de la pro CRM Dros (slug `zera-brasil-quimicos-ltda`).

## Como roda em prod

- Hospedagem: Hostinger shared (mesma conta do site principal da Zera)
- Site principal continua rodando a app Node em `/hbuilds/current/nodejs` via Passenger
- O `.htaccess` dentro de cada pasta de LP desliga Passenger so nessa pasta, pra Apache servir HTML estatico

## Estrutura

```
zera-lp/
├── caixa-de-gordura/
│   ├── index.html
│   └── .htaccess
├── tratamento-de-agua/
│   ├── index.html
│   └── .htaccess
└── README.md
```

## Deploy na VPS Zera (Hostinger)

Repositorio oficial: `Agenciadouc/zera-brasil` (GitHub da Dros). O antigo `soaresjoaoluiz1/zera` nao e mais usado.

**Trocar o servidor pro repo da Dros** (uma vez, se o servidor ainda aponta pro antigo):

```bash
ssh -p 65002 u133586817@45.132.157.150
cd ~/zera-lps
git remote set-url origin https://github.com/Agenciadouc/zera-brasil.git
git fetch origin && git reset --hard origin/main
```

**Setup inicial** (uma vez, servidor do zero):

```bash
ssh -p 65002 u133586817@45.132.157.150

# 1) Clona o repo FORA do webroot (home do usuario)
cd ~
git clone https://github.com/Agenciadouc/zera-brasil.git zera-lps

# 2) Cria symlinks dentro do public_html apontando pras subpastas do repo
cd ~/domains/zerabrasil.com.br/public_html/
ln -s ~/zera-lps/caixa-de-gordura caixa-de-gordura
ln -s ~/zera-lps/tratamento-de-agua tratamento-de-agua
```

**Atualizacoes** (toda vez que mudar algo):

```bash
ssh -p 65002 u133586817@45.132.157.150
cd ~/zera-lps && git pull
```

Um unico `git pull` atualiza as 2 LPs simultaneamente (via symlinks).

## URLs finais

- https://zerabrasil.com.br/caixa-de-gordura/
- https://zerabrasil.com.br/tratamento-de-agua/

## Proximos passos

- Receber modelo/design das LPs do cliente
- Montar formulario de qualificacao em cada LP (tipo empresa, volume mensal, prazo de compra)
- Criar `apps-script.gs` com webhook pro CRM Dros (`https://drosagencia.com.br/crm/api/webhooks/sheets/zera-brasil-quimicos-ltda`)
