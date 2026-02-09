# 04 - Top-k e Similaridade

## O que e
Top-k e a escolha dos k itens mais similares a uma consulta.

Similaridade e a medida de proximidade entre vetores. As metricas mais comuns sao:
- cosine similarity
- dot product

## Por que importa
Top-k e metrica definem o que chega ao modelo de chat. Uma escolha ruim de k ou metrica degrada a resposta final.

Em geral:
- k baixo pode perder contexto util.
- k alto pode introduzir ruido.

## Como aplicamos na PoC
Passos:
1. Gerar embedding da pergunta.
2. Calcular score de similaridade para cada chunk.
3. Ordenar e pegar top-k.
4. Montar contexto final (com limite de tamanho).

Normalizacao:
- Quando usamos cosine similarity, normalizar vetores costuma facilitar comparacao consistente.
- Dot product pode funcionar bem, mas a escala do vetor influencia o score.

## Armadilhas comuns
- Definir k arbitrario sem validacao.
- Comparar scores de metodos diferentes como se fossem equivalentes.
- Nao limitar tamanho final de contexto no prompt.
- Ignorar reranking quando corpus cresce.
