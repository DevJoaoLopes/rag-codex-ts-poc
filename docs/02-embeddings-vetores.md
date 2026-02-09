# 02 - Embeddings e Vetores

## O que e
Embedding e uma representacao numerica (vetor) de um texto em um espaco semantico.

Textos semanticamente proximos tendem a gerar vetores proximos. Cada vetor possui dimensoes (por exemplo, 384, 768, 1024 etc.), definidas pelo modelo de embedding.

## Por que importa
Embeddings sao a base da recuperacao semantica. Sem eles, a busca fica restrita a matching literal de palavras.

Com vetores, conseguimos:
- encontrar sinonimos e variacoes de linguagem
- recuperar contexto relevante mesmo com termos diferentes
- ranquear resultados por proximidade semantica

## Como aplicamos na PoC
Na ingestao:
1. Cada chunk vira um embedding.
2. Armazenamos vetor + texto original + metadados.

Na consulta:
1. A pergunta vira embedding.
2. Calculamos similaridade com os vetores dos chunks.
3. Selecionamos os melhores candidatos para contexto.

## Armadilhas comuns
- Misturar vetores de modelos diferentes no mesmo indice.
- Ignorar normalizacao quando a metrica exige consistencia.
- Assumir que "mais dimensoes" sempre significa "melhor".
- Nao versionar embeddings quando trocar modelo.
