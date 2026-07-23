import Link from "next/link";

export default function OfflinePage() {
  return <main className="offline-page"><div className="brand-mark" aria-hidden="true">O</div><h1>Você está sem conexão</h1><p>Os cenários, rascunhos e registros salvos continuam disponíveis. Uma nova análise será colocada na fila.</p><Link className="button button-primary" href="/">Voltar ao Omnibioma</Link></main>;
}
