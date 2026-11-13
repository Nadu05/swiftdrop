import type { LucideIcon } from 'lucide-react';

export interface BranchFormSectionProps {
  id: string;
  title: string;
  description: string;
  icon?: LucideIcon;
  children: React.ReactNode;
}

/**
 * Reusable section container for the Create Branch and Edit Branch forms.
 * Keeps form sections visually aligned with the Organization directory card design.
 */
export default function BranchFormSection({
  id,
  title,
  description,
  icon: Icon,
  children,
}: BranchFormSectionProps) {
  const headingId = `${id}-heading`;

  return (
    <section className="org-form-section" aria-labelledby={headingId}>
      <div className="org-form-section__header">
        {Icon && (
          <div className="org-form-section__icon" aria-hidden="true">
            <Icon size={18} strokeWidth={2.1} />
          </div>
        )}
        <div className="org-form-section__titles">
          <h2 id={headingId} className="org-form-section__title">
            {title}
          </h2>
          <p className="org-form-section__desc">{description}</p>
        </div>
      </div>

      <div className="org-form-section__body">{children}</div>
    </section>
  );
}

