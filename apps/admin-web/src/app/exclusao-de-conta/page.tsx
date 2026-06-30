export default function ExclusaoContaPage() {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 20px', fontFamily: 'system-ui, sans-serif', lineHeight: 1.6, color: '#1a1a1a' }}>
      <h1>Exclusão de Conta e Dados — Repara Lá</h1>
      <p>Última atualização: 29 de junho de 2026</p>

      <p>
        Você pode solicitar a exclusão da sua conta e dos seus dados pessoais dos aplicativos
        Repara Lá Cliente e Repara Lá Técnico a qualquer momento.
      </p>

      <h2>Como solicitar</h2>
      <p>
        Envie um e-mail para{' '}
        <a href="mailto:comerce.martins@gmail.com?subject=Solicitação de exclusão de conta - Repara Lá">
          comerce.martins@gmail.com
        </a>{' '}
        a partir do endereço de e-mail cadastrado no aplicativo, informando:
      </p>
      <ul>
        <li>Nome completo usado no cadastro</li>
        <li>Número de telefone cadastrado</li>
        <li>Se você é cliente ou técnico</li>
      </ul>
      <p>O pedido será processado em até 7 dias úteis.</p>

      <h2>Dados que serão excluídos</h2>
      <ul>
        <li>Nome, e-mail, telefone e senha</li>
        <li>Endereços cadastrados</li>
        <li>Foto de perfil (técnicos)</li>
        <li>Token de notificação push</li>
      </ul>

      <h2>Dados que podem ser mantidos</h2>
      <p>
        Registros de chamados já concluídos podem ser mantidos de forma anonimizada por motivos
        fiscais, contábeis e de segurança, conforme exigido pela legislação aplicável, mesmo após
        a exclusão da conta.
      </p>

      <h2>Prazo</h2>
      <p>
        A exclusão da conta e dos dados pessoais identificáveis é concluída em até 30 dias após a
        confirmação da solicitação.
      </p>
    </div>
  )
}
