# 03 - Chunking

## O que e
Chunking e o processo de dividir documentos grandes em partes menores (chunks) para indexacao e recuperacao.

Overlap e a sobreposicao controlada entre chunks consecutivos para preservar continuidade de contexto.

## Por que importa
Chunking define a unidade de conhecimento recuperada. Se o chunk for grande demais, traz ruido. Se for pequeno demais, perde contexto.

Uma boa estrategia melhora recall e precisao na recuperacao.

## Como aplicamos na PoC
Heuristica inicial sugerida:
- chunk por tamanho de caracteres ou tokens
- overlap moderado para manter coesao
- metadados por chunk (origem, secao, indice)

Exemplo de ponto de partida:
- tamanho: 500 a 1000 tokens
- overlap: 10% a 20%

Depois, ajustar usando erros reais de consulta.

## Armadilhas comuns
- Usar um unico tamanho fixo para qualquer tipo de documento.
- Overlap alto demais, gerando duplicacao e custo.
- Overlap zero em textos com dependencia entre paragrafos.
- Ignorar estrutura natural (titulos, secoes, tabelas, codigo).

## Tradeoffs
- Chunks maiores: menos fragmentacao, mais ruido.
- Chunks menores: mais precisao local, risco de perder contexto.
- Mais overlap: melhor continuidade, maior custo de armazenamento e busca.
