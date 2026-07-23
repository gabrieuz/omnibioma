# Dados de demonstração

`data/scenarios` é o conjunto canônico do Omnibioma. Os seis cenários combinam imagens abertas com relatos, localizações e históricos fictícios. Eles não representam ocorrências reais no Acre.

Cada pasta contém:

- `image.jpg`: imagem ativa, otimizada e com hash SHA-256 verificado;
- `scenario_seed.json`: contexto fictício usado pela demonstração;
- `attribution.json`: fonte, autoria, licença e modificações;
- `expected_output.json`: snapshot de uma análise identificada por modelo, horário, latência e proveniência;
- `alternative_sources.json`: metadado migrado do antigo `data_2`, marcado `candidate_only`, `unverified` e sem imagem local.

As fontes alternativas não aparecem como cenários ativos porque não vieram acompanhadas de imagem e alguns metadados ainda precisam de verificação. O diretório intermediário `data_2` foi removido somente após `npm run validate:data` confirmar a migração.

Valide hashes, licenças, contrato e isolamento das fontes candidatas com:

```bash
npm run validate:data
```

Os snapshots podem ser renovados com a chave local, sem persistência da interação:

```bash
npm run snapshots
```
