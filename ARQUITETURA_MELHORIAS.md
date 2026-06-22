# Repara Lá — Diagnóstico, Correções e Arquitetura de Evolução

> Documento de engenharia + produto. Escrito para o **Sonnet executar**.
> Cada item tem: **problema → causa raiz → solução exata (arquivos/linhas) → critério de aceite**.
> Stack confirmado: monorepo (npm/pnpm workspaces) · Expo **SDK 54** · React Native · Next.js (admin) · Fastify + Prisma · Supabase (Auth + Postgres + Storage).

---

## PARTE 0 — Resumo executivo (para o dono do produto)

O app já tem o esqueleto certo: cliente abre chamado → admin/técnico recebem → execução com timeline → avaliação. O que **trava conversão e confiança** hoje:

1. **🔴 BUG CRÍTICO — fotos não aparecem.** Causa raiz identificada (não é storage, não é exibição): incompatibilidade do `expo-file-system` com o SDK 54. As fotos do cliente **nunca chegam ao servidor**. Isso destrói a confiança do técnico (vai cego ao local) e do admin (não consegue triar/orçar). É o item nº1.
2. **🟠 Não há aprovação de cadastro.** Hoje qualquer um que baixar e se registrar entra direto. Você pediu gating por aprovação do admin (técnico **e** cliente). Não existe no schema nem no fluxo.
3. **🟡 Monetização ausente.** Não há contrato, diária, nem serviço avulso com preço. Sem isso não há receita recorrente nem retenção de condomínios.
4. **🟡 Compliance Play Store.** Faltam itens obrigatórios (política de privacidade, exclusão de conta, data safety, versionCode, target SDK) que **bloqueiam a publicação**.

A ordem de execução recomendada está na PARTE 6.

---

## PARTE 1 — 🔴 Correção do bug das fotos (PRIORIDADE MÁXIMA)

### 1.1 Causa raiz (confirmada)

No **Expo SDK 54** a biblioteca `expo-file-system` foi reescrita para uma API baseada em classes (`File`, `Directory`, `Paths`). As funções antigas `uploadAsync` e o enum `FileSystemUploadType` **foram removidos do import padrão** e movidos para o submódulo `expo-file-system/legacy`.

O código atual faz:

```ts
import * as FileSystem from 'expo-file-system'
...
const result = await FileSystem.uploadAsync(...)   // ❌ undefined no SDK 54
```

`FileSystem.uploadAsync` é `undefined` → lança `TypeError: ... is not a function` → o `try/catch` engole o erro (`catch { return null }`) → `publicUrl` é `null` → o `POST /orders/:id/media` **nunca é chamado** → nenhum registro em `order_media` → técnico e admin não têm o que exibir.

**Prova de que o resto está correto:**
- `apps/tech-app/src/screens/ActiveOrderScreen.tsx:255-269` filtra `phase === 'REPORT'` e renderiza `m.url` — correto.
- `apps/admin-web/src/app/dashboard/orders/[id]/page.tsx:270-298` renderiza `order.media` com lightbox — correto.
- `packages/api/src/routes/orders.ts:99,120` incluem `media` nas queries — correto.
- O bug é **exclusivamente** no upload (cliente e técnico).

Arquivos afetados (mesma função `uploadToStorage` duplicada):
- `apps/client-app/src/screens/NewOrderScreen.tsx:15-36`
- `apps/tech-app/src/screens/ActiveOrderScreen.tsx:15-36`

### 1.2 Correção mínima (faz a foto funcionar HOJE)

Trocar o import para o submódulo legacy nos **dois** arquivos:

```ts
import * as FileSystem from 'expo-file-system/legacy'
```

Isso restaura `uploadAsync` e `FileSystemUploadType.BINARY_CONTENT` exatamente como o código espera. **Não muda mais nada na função.**

### 1.3 Correção robusta (recomendada — fazer junto)

A função engole erros silenciosamente. Isso foi o que escondeu o bug por semanas. Refatorar para:

1. **Centralizar** a função num único módulo compartilhado (eliminar a duplicação):
   - Criar `apps/client-app/src/services/upload.ts` e `apps/tech-app/src/services/upload.ts` (ou, melhor, um util em cada app importando a mesma lógica). Como os apps não compartilham pacote de RN, duplicar é aceitável, mas **idêntico e testado**.
2. **Propagar erro** em vez de retornar `null` silencioso:

```ts
import * as FileSystem from 'expo-file-system/legacy'
import Constants from 'expo-constants'

const SUPABASE_URL = Constants.expoConfig?.extra?.supabaseUrl as string
const SUPABASE_KEY = Constants.expoConfig?.extra?.supabaseAnonKey as string

export async function uploadToStorage(photoUri: string, filename: string): Promise<string> {
  const result = await FileSystem.uploadAsync(
    `${SUPABASE_URL}/storage/v1/object/order-media/${filename}`,
    photoUri,
    {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: {
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'image/jpeg',
        'x-upsert': 'true',
      },
    }
  )
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Upload falhou (${result.status}): ${result.body}`)
  }
  return `${SUPABASE_URL}/storage/v1/object/public/order-media/${filename}`
}
```

3. **Tratar falha no caller** (`handleSubmit` / `uploadCompletionPhoto`): contar quantas fotos subiram, e se alguma falhar, avisar o usuário em vez de criar o chamado "sem foto" silenciosamente. No cliente, **não bloquear** a abertura do chamado se a foto falhar (a manutenção é mais importante que a foto), mas mostrar aviso: _"Chamado aberto, mas N foto(s) não enviada(s). Tente reenviar."_ No técnico, a foto de conclusão é obrigatória → se falhar, **não** avançar o status.

### 1.4 Verificação de Storage (checklist, não código)

Mesmo com a correção, validar no Supabase (a memória diz que já está, confirmar):
- Bucket `order-media` existe e é **público** (ou tem policy SELECT para `anon`/`public`).
- Policy de **INSERT** para `anon` no bucket (o upload usa a anon key). Se não houver, o upload retorna 400/403 e agora o erro **aparecerá** (graças ao 1.3).

### 1.5 Critério de aceite
- [ ] Cliente abre chamado com foto → registro em `order_media` com `phase=REPORT`.
- [ ] Foto aparece em `ActiveOrderScreen` (técnico) e na página de detalhe do admin.
- [ ] Técnico finaliza com foto → `phase=COMPLETION` aparece no admin.
- [ ] Falha de upload mostra mensagem clara (testar com chave inválida).

---

## PARTE 2 — 🟠 Aprovação de cadastro (gating de acesso)

**Requisito do dono:** técnico e cliente só acessam após aprovação do admin. App não pode ser usável por qualquer um que baixar da Play Store.

### 2.1 Schema (`packages/db/prisma/schema.prisma`)

Adicionar ao model `User`:

```prisma
enum AccountStatus {
  PENDING   // cadastrado, aguardando aprovação do admin
  APPROVED
  REJECTED
  SUSPENDED
}

model User {
  ...
  accountStatus AccountStatus @default(PENDING) @map("account_status")
  approvedAt    DateTime?     @map("approved_at")
  approvedBy    String?       @map("approved_by")  // id do admin
  ...
}
```

> Migração: `pnpm db:migrate`. Definir admins existentes como `APPROVED` num seed/SQL após migrar (senão você se tranca para fora).

### 2.2 API (`packages/api/src/routes/auth.ts`)
- `register`: criar com `accountStatus = PENDING` (admins criados pelo painel podem nascer `APPROVED`). **Não retornar token de acesso pleno** — retornar estado "pendente".
- `login`: após validar senha, **bloquear** se `accountStatus !== 'APPROVED'`. Retornar 403 com mensagem clara: _"Cadastro em análise. Você será avisado quando for aprovado."_ / _"Cadastro não aprovado."_
- Notificar admins (push) quando houver novo cadastro pendente.

### 2.3 API — novos endpoints admin (`routes/admins.ts` ou `routes/users.ts`)
- `GET /admin/pending-users` — lista cadastros `PENDING` (filtrar por role).
- `PATCH /admin/users/:id/approve` — seta `APPROVED`, `approvedAt`, `approvedBy`; dispara push/notificação ao usuário ("Cadastro aprovado! Já pode entrar.").
- `PATCH /admin/users/:id/reject` — seta `REJECTED`.
- `PATCH /admin/users/:id/suspend` — seta `SUSPENDED` (banir mau ator sem deletar histórico).
- Todos protegidos por `role === 'ADMIN'` + permissão (`MANAGE_TECHNICIANS` / `MANAGE_CLIENTS`).

### 2.4 Admin Web
- Nova seção **"Aprovações pendentes"** no dashboard (badge com contagem).
- Cada card: nome, telefone, role, dados do cliente/condomínio ou especialidades do técnico → botões **Aprovar / Rejeitar**.

### 2.5 Apps (cliente e técnico)
- Tela de **"Cadastro em análise"** quando login retorna 403 PENDING.
- Push "aprovado" → libera login.

### 2.6 Critério de aceite
- [ ] Novo cadastro não consegue logar até aprovação.
- [ ] Admin vê e aprova/rejeita.
- [ ] Usuário aprovado recebe push e entra normalmente.

---

## PARTE 3 — 💰 Monetização: contratos, diárias e serviços avulsos

**Visão de negócio:** o ouro aqui é o **contrato recorrente com condomínio** (receita previsível + retenção). Diária e avulso são portas de entrada e upsell.

### 3.1 Modelos de receita a suportar

| Modelo | Descrição | Receita |
|---|---|---|
| **Contrato (assinatura)** | Condomínio paga mensalidade fixa; X chamados/mês inclusos, SLA garantido | Recorrente (MRR) |
| **Diária** | Técnico alocado por dia/turno (ex.: manutenção predial programada) | Por diária |
| **Avulso** | Chamado isolado, orçado e pago por serviço | Por transação |

### 3.2 Schema proposto (incremental, não quebra o atual)

```prisma
enum ContractStatus { ACTIVE PAUSED CANCELLED }
enum BillingModel  { CONTRACT DAILY ONE_OFF }

model Contract {
  id            String   @id @default(uuid())
  clientId      String   @map("client_id")
  client        Client   @relation(fields: [clientId], references: [id])
  status        ContractStatus @default(ACTIVE)
  monthlyValue  Decimal  @map("monthly_value") @db.Decimal(10,2)
  includedCalls Int      @map("included_calls")   // chamados inclusos/mês
  slaHours      Int      @map("sla_hours")        // SLA contratual
  startsAt      DateTime @map("starts_at")
  endsAt        DateTime? @map("ends_at")
  createdAt     DateTime @default(now())
  orders        Order[]
}

// No model Order, adicionar:
//   billingModel  BillingModel @default(ONE_OFF)
//   contractId    String?
//   contract      Contract? @relation(...)
//   quotedValue   Decimal? @db.Decimal(10,2)   // orçamento
//   finalValue    Decimal? @db.Decimal(10,2)   // valor cobrado
//   paymentStatus String?  // PENDING | PAID | WAIVED (incluso no contrato)
```

> **Não** integrar gateway de pagamento agora. Fase 1 = registrar valores e status manualmente no admin (orçar/marcar pago). Fase 2 = Pix/gateway (ver 3.4).

### 3.3 Fluxo de orçamento (aumenta conversão)
1. Cliente abre chamado (avulso) → status `OPEN`.
2. Admin/técnico avalia (com a **foto já funcionando** — daí a Parte 1 ser pré-requisito) → lança `quotedValue`.
3. Cliente **aprova o orçamento** no app antes do técnico ir → reduz no-show e disputa.
4. Conclusão → `finalValue` → `paymentStatus`.
5. Chamados de contrato: pular orçamento, debitar do saldo de `includedCalls`.

### 3.4 Pagamento (fase 2)
- Brasil: **Pix** é o caminho (Mercado Pago, Asaas ou Stripe). Asaas/Mercado Pago têm boa API Pix + boleto e são comuns para PMEs.
- Webhook → atualiza `paymentStatus`. Repasse a técnico = relatório no admin.

### 3.5 Critério de aceite (fase 1)
- [ ] Admin cria contrato para um condomínio.
- [ ] Chamado de cliente com contrato não cobra avulso (debita do saldo).
- [ ] Admin orça avulso; cliente aprova; valores aparecem no detalhe.

---

## PARTE 4 — 📈 Retenção, satisfação e conversão (visão empreendedor)

Itens de produto que convertem dinheiro e seguram cliente, ordenados por ROI:

1. **Foto funcionando (Parte 1)** — base de tudo: confiança e orçamento à distância.
2. **Endereço real do chamado.** Hoje `NewOrderScreen.tsx:141-142` envia `'Endereço do perfil'` e `'São Paulo'` **hardcoded**. 🔴 Isso quebra o roteamento do técnico no mundo real. Usar o endereço do `Client` (e permitir escolher unidade no condomínio). **Corrigir junto com a Parte 1.**
3. **Rastreio em tempo real + ETA** do técnico (timeline já existe; faltam timestamps visíveis e push — já há push, reforçar).
4. **Avaliação + NPS** já existe (`/rate`). Adicionar: foto de conclusão obrigatória já força prova de serviço (bom). Exibir histórico de avaliações do técnico.
5. **Síndico/condomínio multi-unidade:** um login de síndico que abre chamados para áreas comuns + acompanha todos do prédio → ticket médio maior.
6. **Garantia do serviço** (ex.: 90 dias): reabrir chamado vinculado sem custo dentro da garantia → percepção de qualidade.
7. **Histórico e relatórios** para o condomínio (PDF mensal: chamados, tempo médio, custo) → justifica a mensalidade e segura o contrato.
8. **Notificações já existem** — auditar textos e adicionar deep-link consistente (`screen` no payload já é usado em parte).

---

## PARTE 5 — 🤖 Compliance Google Play (bloqueia publicação se faltar)

Itens **obrigatórios** para aprovar os 2 apps na Play Store:

1. **Política de Privacidade (URL pública)** — obrigatória porque o app pede CÂMERA, GALERIA, localização e dados pessoais. Hospedar (ex.: numa rota do admin web `/privacidade`) e declarar no Play Console.
2. **Exclusão de conta** — o Google exige fluxo de exclusão **dentro do app** e uma URL web de solicitação de exclusão. Implementar `DELETE /auth/me` (soft-delete/anonimização respeitando histórico de chamados) + tela "Excluir minha conta".
3. **Data Safety form** — declarar coleta: nome, telefone, fotos, localização, push token. Bater com o que o app realmente coleta.
4. **Permissões justificadas** — `app.json` do cliente lista `RECORD_AUDIO` e `WRITE_EXTERNAL_STORAGE`. ⚠️ Áudio **não é usado** no código → **remover** (permissão não usada gera reprovação/atrito). `WRITE_EXTERNAL_STORAGE` é desnecessária em Android 13+ → revisar.
5. **`android.versionCode`** — definir e incrementar a cada build (EAS pode auto-incrementar). Hoje só há `version`.
6. **Target SDK** — EAS/SDK 54 já cobre o target atual exigido (Android 14/API 34+), confirmar no build.
7. **Ícone/splash/assets** em todas as densidades (já há adaptive icon — validar).
8. **Conta de teste para revisão** — como o acesso é **gated por aprovação** (Parte 2), o revisor do Google **não conseguirá entrar**. ⚠️ Criar credenciais de teste já aprovadas e fornecer em "App access" no Play Console, senão o app é **reprovado por "não conseguimos acessar"**.
9. **Dois apps separados** — cliente (`com.reparala.client`) e técnico (`com.reparala.tech`) são apps distintos no Console. Confirmar `package` único de cada.

---

## PARTE 6 — Ordem de execução recomendada (roadmap)

**Sprint 1 — Destravar o essencial (sem isso nada converte)**
1. Parte 1: correção das fotos (import legacy + robustez). ⏱ rápido, impacto enorme.
2. Parte 4 item 2: endereço real do chamado (hardcoded → endereço do cliente).
3. Build EAS dos 2 apps + validar fim a fim.

**Sprint 2 — Controle de acesso (requisito do dono)**
4. Parte 2: aprovação de cadastro (schema + API + admin + telas).
5. Parte 5 item 8: usuário de teste aprovado para o Google.

**Sprint 3 — Publicação**
6. Parte 5: política de privacidade, exclusão de conta, data safety, limpar permissões, versionCode.
7. Submeter à Play Store (closed testing primeiro).

**Sprint 4 — Receita**
8. Parte 3 fase 1: contratos/diária/avulso + orçamento (sem gateway).
9. Parte 4: relatórios para condomínio, garantia, login de síndico.

**Sprint 5 — Escala**
10. Parte 3 fase 2: Pix/gateway + repasses.

---

## Apêndice — Notas técnicas para o executor

- **`catch {}` silencioso** aparece em vários lugares (`loadOrder`, `uploadToStorage`, `loadData`). Padronizar: logar erro e/ou mostrar feedback. Foi a causa de o bug das fotos ficar invisível.
- **Função `uploadToStorage` duplicada** em cliente e técnico — manter idênticas; se divergirem, bugam separado.
- **Validação Zod ausente** em `POST /orders/:id/media` e em `/admin-status`, `/assign` (usam `as` cast). Adicionar schemas para evitar dados inválidos.
- **`serviceAddress`/`serviceCity` hardcoded** em `NewOrderScreen.tsx:141-142` — corrigir (item de produto crítico).
- **Migrações Prisma**: rodar `pnpm db:migrate` após mexer no schema; cuidado para marcar admins como `APPROVED` no mesmo deploy.
- **`package-lock.json`** deve ser atualizado antes de cada build EAS (memória do projeto).
- **Não** subir gateway de pagamento sem o dono definir o provedor (Pix/Asaas/Mercado Pago) — decisão de negócio.
</content>
</invoke>
