import { Link } from "react-router-dom";

export default function PageHeader({
  title,
  description,
  action,
  breadcrumb,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  breadcrumb?: { label: string; to: string };
}) {
  return (
    <header className="page-header">
      <div className="page-header-text">
        {breadcrumb && (
          <Link to={breadcrumb.to} className="breadcrumb">
            {breadcrumb.label}
          </Link>
        )}
        <h1 className="page-title">{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {action && <div className="page-header-action">{action}</div>}
    </header>
  );
}
