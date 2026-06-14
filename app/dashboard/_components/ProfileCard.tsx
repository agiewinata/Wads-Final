const IRREGULAR = "6px 8px 5px 7px / 7px 5px 8px 6px";

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
      value: createdAt.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    },
    {
      label: "Active for",
      value: memberMonths === 1 ? "1 month" : `${memberMonths} months`,
    },
  ];

  return (
    <div
      className="bg-white h-full w-full p-6 flex flex-col"
      style={{
        border: "3px solid #111",
        borderRadius: IRREGULAR,
        boxShadow: "6px 8px 0 rgba(0,0,0,0.12)",
      }}
    >
      {/* Avatar + name */}
      <div className="flex items-center gap-4 mb-6">
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: "#111",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            flexShrink: 0,
          }}
        >
          {initials}
        </div>
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "#a1a1aa",
              marginBottom: 2,
            }}
          >
            Welcome back
          </div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 800,
              fontStyle: "italic",
              letterSpacing: "-0.03em",
              color: "#111",
              lineHeight: 1,
            }}
          >
            {name ?? email.split("@")[0]}
          </h1>
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: "1.5px solid #e4e4e7", marginBottom: 16 }} />

      {/* Info rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 0, flex: 1 }}>
        {rows.map(({ label, value }) => (
          <div
            key={label}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 0",
              borderBottom: "1px solid #f4f4f5",
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                color: "#a1a1aa",
              }}
            >
              {label}
            </span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#111",
                maxWidth: "60%",
                textAlign: "right",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
