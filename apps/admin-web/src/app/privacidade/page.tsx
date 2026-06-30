export default function PrivacidadePage() {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 20px', fontFamily: 'system-ui, sans-serif', lineHeight: 1.6, color: '#1a1a1a' }}>
      <h1>Política de Privacidade — Repara Lá</h1>
      <p>Última atualização: 29 de junho de 2026</p>

      <p>
        O Repara Lá ("nós", "nosso aplicativo") respeita a privacidade dos usuários dos
        aplicativos Repara Lá Cliente e Repara Lá Técnico. Esta política explica quais dados
        coletamos, como usamos e como protegemos essas informações.
      </p>

      <h2>1. Dados que coletamos</h2>
      <ul>
        <li>Nome completo, e-mail e telefone, fornecidos no cadastro</li>
        <li>Endereço de serviço informado ao abrir um chamado</li>
        <li>Localização aproximada, quando autorizada, para localizar técnicos disponíveis</li>
        <li>Foto de perfil (opcional), para técnicos</li>
        <li>Histórico de chamados, avaliações e mensagens relacionadas ao atendimento</li>
        <li>Token de notificação push, para envio de alertas sobre o status do chamado</li>
      </ul>

      <h2>2. Como usamos os dados</h2>
      <ul>
        <li>Conectar clientes a técnicos disponíveis na região</li>
        <li>Enviar notificações sobre o andamento do chamado</li>
        <li>Melhorar a qualidade do serviço e a experiência no aplicativo</li>
        <li>Cumprir obrigações legais e de segurança</li>
      </ul>

      <h2>3. Compartilhamento de dados</h2>
      <p>
        Não vendemos dados pessoais a terceiros. Dados de contato e localização do chamado são
        compartilhados apenas entre cliente e técnico designado, para viabilizar o atendimento.
        Utilizamos provedores de infraestrutura (Supabase e Render) para armazenamento e
        processamento seguro dos dados.
      </p>

      <h2>4. Armazenamento e segurança</h2>
      <p>
        Os dados são armazenados em servidores com criptografia em trânsito (HTTPS/TLS) e
        controle de acesso restrito. Senhas são armazenadas com hash seguro.
      </p>

      <h2>5. Seus direitos</h2>
      <p>
        Você pode solicitar a exclusão da sua conta e dos seus dados a qualquer momento,
        entrando em contato pelo e-mail abaixo.
      </p>

      <h2>6. Contato</h2>
      <p>
        Em caso de dúvidas sobre esta política, entre em contato:{' '}
        <a href="mailto:comerce.martins@gmail.com">comerce.martins@gmail.com</a>
      </p>
    </div>
  )
}
