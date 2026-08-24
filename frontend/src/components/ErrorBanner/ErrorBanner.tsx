interface ErrorBannerProps {
  message: string | null | undefined;
}

// Padroniza a exibição de erro nas páginas que consomem react-query: mesma marcação,
// mesma classe (`form-error`, já usada em toda a base) e `role="alert"` para leitores de tela.
export function ErrorBanner({ message }: ErrorBannerProps) {
  if (!message) {
    return null;
  }
  return (
    <p className="form-error" role="alert">
      {message}
    </p>
  );
}
