import { ReactNode } from "react";

interface PageHeaderProps {
  title: ReactNode;
  description?: string;
  actions?: ReactNode;
  titleExtra?: ReactNode;
}

export function PageHeader({ title, description, actions, titleExtra }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-8">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {titleExtra}
        </div>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
