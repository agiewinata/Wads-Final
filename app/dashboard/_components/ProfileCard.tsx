type ProfileCardProps = {
  name: string | null;
  email: string;
  createdAt: Date;
};

export default function ProfileCard({ name, email, createdAt }: ProfileCardProps) {
  const initials = (name ?? email)
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const memberMonths = Math.max(
    1,
    Math.round((now - createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30))
  );

  const rows = [
    { label: "Email", value: email },
    {
      label: "Member since",
      value: createdAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
    },
    { label: "Active for", value: memberMonths === 1 ? "1 month" : `${memberMonths} months` },
  ];

  return (
    <div className="sticky sticky--blue h-full w-full flex flex-col" style={{ padding: "26px 24px", borderRadius: 3 }}>
      {/* pin */}
      <div className="pin" style={{ position: "absolute", top: -6, left: "50%", transform: "translateX(-50%)" }} />

      {/* avatar + name */}
      <div className="flex items-center gap-4 mb-5" style={{ marginTop: 4 }}>
        <div
          className="grid place-items-center"
          style={{ width: 52, height: 52, borderRadius: 14, background: "var(--note-text)", color: "var(--note-blue)", fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 19, flexShrink: 0 }}
        >
          {initials}
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--note-text)", opacity: .6 }}>
            Welcome back
          </div>
          <h1 className="hand" style={{ fontFamily: "var(--font-hand)", fontWeight: 700, fontSize: 28, lineHeight: 1.05, color: "var(--note-text)" }}>
            {name ?? email.split("@")[0]}
          </h1>
        </div>
      </div>

      <div style={{ borderTop: "1.5px dashed rgba(74,63,46,.25)", marginBottom: 12 }} />

      <div className="flex flex-col flex-1">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex justify-between items-center" style={{ padding: "9px 0", borderBottom: "1px solid rgba(74,63,46,.12)" }}>
            <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--note-text)", opacity: .6 }}>
              {label}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--note-text)", maxWidth: "60%", textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}