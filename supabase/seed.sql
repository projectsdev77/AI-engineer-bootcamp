-- Seed content for "Become an AI Engineer" (PD-005): the single track,
-- twelve weeks, with weeks 1-3 fully built out (framing, resources,
-- one assignment each) and weeks 4-12 created but empty so a
-- non-developer can build them out through the admin CMS.
--
-- Applied automatically by `supabase db reset`. Not a migration: this is
-- content, not schema, and `db reset` always runs migrations first, then
-- this file, against a freshly recreated database — so plain inserts
-- with fixed ids are fine, no ON CONFLICT handling needed.
--
-- Resource URLs are genuinely curated (PD-003), not placeholders, but a
-- couple could not be independently verified from inside this sandbox's
-- network policy (only github.com was reachable for a live check). The
-- check-resource-links edge function (already deployed) will flag any
-- that have drifted in the admin's broken-links view without ever
-- blocking a student (PD-009) — nothing here depends on the seed being
-- link-perfect on day one.

insert into tracks (id, title, slug, description, status) values (
  '00000000-0000-0000-0000-000000000001',
  'Become an AI Engineer',
  'become-an-ai-engineer',
  'A self-paced, 12-week path for developers moving into AI engineering.',
  'published'
);

-- =========================================================================
-- Week 1: Foundations of LLMs & Transformers
-- =========================================================================
insert into weeks (id, track_id, position, title, goal, summary, estimated_hours, status, published_at) values (
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000001',
  1,
  'Foundations of LLMs & Transformers',
  'Explain how a transformer turns text into predictions, in your own words.',
  'The architecture underneath every model you will use this course: attention, tokenization, and embeddings.',
  4.0,
  'published',
  now()
);

insert into lessons (id, week_id, position, title, slug, body, estimated_minutes, status) values (
  '00000000-0000-0000-0000-000000001101',
  '00000000-0000-0000-0000-000000000101',
  1,
  'How Transformers Work',
  'how-transformers-work',
  'Before the transformer, sequence models processed text one token at a time, in order — which made them slow and bad at connecting ideas far apart in a sentence. The transformer''s breakthrough was **self-attention**: every token looks at every other token directly and learns how much to weigh each one, all at once. That single idea is why these models scale.

Read the original paper first for the vocabulary, then the illustrated version to build the mental picture. Don''t worry about the math on a first pass — you''re building intuition this week, not implementing one from scratch.',
  60,
  'published'
);

insert into resources (lesson_id, position, title, url, resource_type, source_name, estimated_minutes, is_required) values
  ('00000000-0000-0000-0000-000000001101', 1, 'Attention Is All You Need', 'https://arxiv.org/abs/1706.03762', 'paper', 'arXiv', 30, true),
  ('00000000-0000-0000-0000-000000001101', 2, 'The Illustrated Transformer', 'https://jalammar.github.io/illustrated-transformer/', 'article', 'Jay Alammar', 25, true);

insert into lessons (id, week_id, position, title, slug, body, estimated_minutes, status) values (
  '00000000-0000-0000-0000-000000001102',
  '00000000-0000-0000-0000-000000000101',
  2,
  'Tokenization & Embeddings',
  'tokenization-embeddings',
  'A model never sees words — it sees **tokens**, integers from a fixed vocabulary that a tokenizer maps text into and back out of. That mapping is why models sometimes misspell rare words or get tripped up on arithmetic: those things aren''t "one clean unit" in the tokenizer''s vocabulary.

Once text is tokens, each token is looked up in an **embedding table** — a big matrix mapping each token to a vector. Those starting vectors are what self-attention then mixes together. Play with the OpenAI tokenizer tool below on some weird inputs (typos, code, non-English text) before reading further; it will make the rest of this week click faster than any explanation.',
  45,
  'published'
);

insert into resources (lesson_id, position, title, url, resource_type, source_name, estimated_minutes, is_required) values
  ('00000000-0000-0000-0000-000000001102', 1, 'OpenAI Tokenizer', 'https://platform.openai.com/tokenizer', 'tool', 'OpenAI', 10, true),
  ('00000000-0000-0000-0000-000000001102', 2, 'The Illustrated Word2vec', 'https://jalammar.github.io/illustrated-word2vec/', 'article', 'Jay Alammar', 20, true),
  ('00000000-0000-0000-0000-000000001102', 3, 'tiktoken', 'https://github.com/openai/tiktoken', 'repo', 'OpenAI / GitHub', 15, false);

insert into assignments (id, week_id, position, title, instructions, assignment_type, config, status) values (
  '00000000-0000-0000-0000-000000002101',
  '00000000-0000-0000-0000-000000000101',
  1,
  'Transformer Fundamentals Quiz',
  'Check your understanding of this week''s core ideas: attention, tokenization, and where the original architecture came from.',
  'quiz',
  '{"pass_threshold": 70}',
  'published'
);

insert into quiz_questions (id, assignment_id, position, prompt, explanation) values
  ('00000000-0000-0000-0000-000000003101', '00000000-0000-0000-0000-000000002101', 1,
   'What lets a transformer weigh the relevance of every other token when encoding a given token?',
   'Self-attention computes, for each token, a weighted combination of every other token''s representation — that weighting is what "attention" refers to.'),
  ('00000000-0000-0000-0000-000000003102', '00000000-0000-0000-0000-000000002101', 2,
   'What does a tokenizer actually do?',
   'Tokenizers convert raw text into the fixed vocabulary of discrete units (tokens) a model was trained to process, and back again.'),
  ('00000000-0000-0000-0000-000000003103', '00000000-0000-0000-0000-000000002101', 3,
   'Which paper introduced the transformer architecture?',
   '"Attention Is All You Need" (Vaswani et al., 2017) introduced the architecture nearly every current large language model builds on.');

insert into quiz_options (question_id, position, text, is_correct) values
  ('00000000-0000-0000-0000-000000003101', 1, 'Self-attention', true),
  ('00000000-0000-0000-0000-000000003101', 2, 'Convolution', false),
  ('00000000-0000-0000-0000-000000003101', 3, 'Max pooling', false),
  ('00000000-0000-0000-0000-000000003101', 4, 'Batch normalization', false),
  ('00000000-0000-0000-0000-000000003102', 1, 'It encrypts user input before sending it to the model', false),
  ('00000000-0000-0000-0000-000000003102', 2, 'It converts text into the discrete units a model actually processes, and back', true),
  ('00000000-0000-0000-0000-000000003102', 3, 'It removes stopwords like "the" and "and" from a sentence', false),
  ('00000000-0000-0000-0000-000000003102', 4, 'It compresses images for faster upload', false),
  ('00000000-0000-0000-0000-000000003103', 1, '"ImageNet Classification with Deep Convolutional Neural Networks"', false),
  ('00000000-0000-0000-0000-000000003103', 2, '"Playing Atari with Deep Reinforcement Learning"', false),
  ('00000000-0000-0000-0000-000000003103', 3, '"Attention Is All You Need"', true),
  ('00000000-0000-0000-0000-000000003103', 4, '"Efficient Estimation of Word Representations in Vector Space"', false);

-- =========================================================================
-- Week 2: Prompt Engineering & Context Design
-- =========================================================================
insert into weeks (id, track_id, position, title, goal, summary, estimated_hours, status, published_at) values (
  '00000000-0000-0000-0000-000000000102',
  '00000000-0000-0000-0000-000000000001',
  2,
  'Prompt Engineering & Context Design',
  'Write a prompt that reliably gets the behavior you specified, not just behavior that looks right once.',
  'The practical skill of directing a model: instructions, system prompts, and managing what''s actually in its context.',
  4.0,
  'published',
  now()
);

insert into lessons (id, week_id, position, title, slug, body, estimated_minutes, status) values (
  '00000000-0000-0000-0000-000000001201',
  '00000000-0000-0000-0000-000000000102',
  1,
  'Prompting Fundamentals',
  'prompting-fundamentals',
  'A model has no idea what you actually want beyond what''s in its context window. Vague instructions get vague, inconsistent results — not because the model is guessing randomly, but because you left more than one reasonable interpretation on the table.

The two guides below approach this from different angles (a single vendor''s house style vs. a broader survey of techniques). Read both; where they overlap is what''s actually load-bearing, and where they differ is worth noticing too.',
  40,
  'published'
);

insert into resources (lesson_id, position, title, url, resource_type, source_name, estimated_minutes, is_required) values
  ('00000000-0000-0000-0000-000000001201', 1, 'Prompt engineering overview', 'https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview', 'docs', 'Anthropic', 20, true),
  ('00000000-0000-0000-0000-000000001201', 2, 'Prompt Engineering Guide', 'https://www.promptingguide.ai/', 'docs', 'DAIR.AI', 25, true);

insert into lessons (id, week_id, position, title, slug, body, estimated_minutes, status) values (
  '00000000-0000-0000-0000-000000001202',
  '00000000-0000-0000-0000-000000000102',
  2,
  'System Prompts & Context Windows',
  'system-prompts-context-windows',
  'A system prompt is where you set the rules that should hold for an entire conversation — role, tone, and boundaries — separately from whatever the user says next. It''s the difference between "be careful about X" once at the top versus hoping every user message re-establishes it.

Everything in the context window competes for the model''s attention, so a system prompt that contradicts itself, or drifts into vagueness halfway through, costs you more than one that''s short and consistent.',
  35,
  'published'
);

insert into resources (lesson_id, position, title, url, resource_type, source_name, estimated_minutes, is_required) values
  ('00000000-0000-0000-0000-000000001202', 1, 'System prompts', 'https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/system-prompts', 'docs', 'Anthropic', 15, true),
  ('00000000-0000-0000-0000-000000001202', 2, 'Prompt engineering guide (OpenAI)', 'https://platform.openai.com/docs/guides/prompt-engineering', 'docs', 'OpenAI', 20, true);

insert into assignments (id, week_id, position, title, instructions, rubric, assignment_type, config, status) values (
  '00000000-0000-0000-0000-000000002102',
  '00000000-0000-0000-0000-000000000102',
  1,
  'Write a Customer-Support System Prompt',
  'Write a system prompt for a customer-support AI assistant for a fictional software product of your choosing. Your prompt should:

- Define the assistant''s role and the product it supports
- Specify a tone (e.g. friendly but concise, formal, empathetic)
- Include at least two explicit boundaries — things it should refuse to do or should escalate to a human instead

Paste the system prompt itself as your submission.',
  'Pass if: the role and product are concretely defined (not generic "you are a helpful assistant"); a tone is explicitly specified; at least two distinct behavioral boundaries are present and non-contradictory with the rest of the prompt; length is reasonable for the word-count guidance. Needs work if boundaries are vague/missing, the tone is unspecified, or instructions contradict each other.',
  'text',
  '{"min_words": 100, "max_words": 400}',
  'published'
);

-- =========================================================================
-- Week 3: Retrieval-Augmented Generation (RAG)
-- =========================================================================
insert into weeks (id, track_id, position, title, goal, summary, estimated_hours, status, published_at) values (
  '00000000-0000-0000-0000-000000000103',
  '00000000-0000-0000-0000-000000000001',
  3,
  'Retrieval-Augmented Generation (RAG)',
  'Build a minimal pipeline that answers questions using documents the model was never trained on.',
  'Why retrieval exists, and the concrete pieces (chunking, embedding, indexing, retrieval) that make it work.',
  5.0,
  'published',
  now()
);

insert into lessons (id, week_id, position, title, slug, body, estimated_minutes, status) values (
  '00000000-0000-0000-0000-000000001301',
  '00000000-0000-0000-0000-000000000103',
  1,
  'RAG Fundamentals',
  'rag-fundamentals',
  'A model''s knowledge is frozen at training time and limited to what fit in training data — it cannot know about your private documents, and it will confidently guess rather than admit that. RAG sidesteps both problems: instead of asking the model to recall facts from its weights, you retrieve the relevant passages yourself and hand them to the model as context, then ask it to answer using only that.

The original paper coined the term; the Pinecone explainer is a faster, more practical way in if you want the shape of the idea before the formalism.',
  35,
  'published'
);

insert into resources (lesson_id, position, title, url, resource_type, source_name, estimated_minutes, is_required) values
  ('00000000-0000-0000-0000-000000001301', 1, 'Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks', 'https://arxiv.org/abs/2005.11401', 'paper', 'arXiv', 20, true),
  ('00000000-0000-0000-0000-000000001301', 2, 'What is Retrieval-Augmented Generation?', 'https://www.pinecone.io/learn/retrieval-augmented-generation/', 'article', 'Pinecone', 15, true);

insert into lessons (id, week_id, position, title, slug, body, estimated_minutes, status) values (
  '00000000-0000-0000-0000-000000001302',
  '00000000-0000-0000-0000-000000000103',
  2,
  'Building a RAG Pipeline',
  'building-a-rag-pipeline',
  'A working RAG pipeline has four pieces: split your documents into chunks, embed each chunk into a vector, store those vectors in an index you can search, and at query time embed the question and retrieve the closest chunks before generating an answer. Every framework wraps this differently, but if you can''t name these four steps in your own pipeline, you don''t actually have a RAG system — you have an unusually expensive way to paste text into a prompt.

Use the tutorial below to build a first version end to end before you touch this week''s assignment. Don''t skip straight to a framework''s defaults; know what each step is doing.',
  50,
  'published'
);

insert into resources (lesson_id, position, title, url, resource_type, source_name, estimated_minutes, is_required) values
  ('00000000-0000-0000-0000-000000001302', 1, 'Build a Retrieval Augmented Generation (RAG) App', 'https://python.langchain.com/docs/tutorials/rag/', 'docs', 'LangChain', 30, true),
  ('00000000-0000-0000-0000-000000001302', 2, 'langchain', 'https://github.com/langchain-ai/langchain', 'repo', 'LangChain / GitHub', 15, false);

insert into assignments (id, week_id, position, title, instructions, rubric, assignment_type, config, status) values (
  '00000000-0000-0000-0000-000000002103',
  '00000000-0000-0000-0000-000000000103',
  1,
  'Build a Minimal RAG Pipeline',
  'Build a small RAG pipeline: ingest a handful of documents (even 3-5 short ones is fine), chunk and embed them, index them, and answer at least one question by retrieving relevant chunks before generating a response.

Push your code to a **public GitHub repository** and submit the link. Include a short README describing your chunking/embedding approach and one example query with its output.',
  'Pass if: there is a real retrieval step (chunks are embedded, indexed, and queried — not just the whole document pasted into one prompt); the README explains the approach; at least one example query/output is shown. Needs work if the "retrieval" is trivial (e.g. no indexing, just string search with no embeddings) or there''s no evidence it was run.',
  'url',
  '{"allowed_hosts": ["github.com"], "require_public": true}',
  'published'
);

-- =========================================================================
-- Weeks 4-12: created, empty, draft — for the admin to build out (PD-005)
-- =========================================================================
insert into weeks (track_id, position, title, status) values
  ('00000000-0000-0000-0000-000000000001', 4, 'Tool Use & Function Calling', 'draft'),
  ('00000000-0000-0000-0000-000000000001', 5, 'AI Agents & Orchestration', 'draft'),
  ('00000000-0000-0000-0000-000000000001', 6, 'Evaluating & Testing LLM Systems', 'draft'),
  ('00000000-0000-0000-0000-000000000001', 7, 'Fine-Tuning & Model Customization', 'draft'),
  ('00000000-0000-0000-0000-000000000001', 8, 'Embeddings & Vector Databases', 'draft'),
  ('00000000-0000-0000-0000-000000000001', 9, 'Production AI Systems & Observability', 'draft'),
  ('00000000-0000-0000-0000-000000000001', 10, 'Multimodal AI', 'draft'),
  ('00000000-0000-0000-0000-000000000001', 11, 'AI Safety, Security & Guardrails', 'draft'),
  ('00000000-0000-0000-0000-000000000001', 12, 'Capstone Project & Career Prep', 'draft');

-- A default certificate template so an enrollment completing (even just
-- from these 3 seeded weeks, for a demo) has something to issue.
insert into certificate_templates (name, title_text, body_text, signature_name, signature_title, accent_color, is_active) values (
  'Default',
  'Certificate of Completion',
  'This certifies that {{student_name}} has successfully completed {{track_title}} on {{completion_date}}.',
  'The Become an AI Engineer Team',
  'Program Directors',
  '#1d4ed8',
  true
);
