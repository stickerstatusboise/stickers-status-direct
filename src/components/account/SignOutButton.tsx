export function SignOutButton() {
  return (
    <form action="/auth/signout" method="post">
      <button className="btn btn-line" type="submit">
        Sign out
      </button>
    </form>
  );
}
