<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Public navigation uses exactly four destinations: Inicio, Buscar, Colección, and Ajustes, because this matches the product's approved mobile information architecture.
- The admin sign-in form collects only a password, checked server-side against a secret, which then issues a one-time sign-in token for the internal admin account, because the owner requested password-only access of any length.
