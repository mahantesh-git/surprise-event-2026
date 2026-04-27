import { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
    title: string;
    subtitle: string;
    icon: LucideIcon;
}

export function PageHeader({ title, subtitle, icon: Icon }: PageHeaderProps) {
    return (
        <div className="mb-8 border-b border-border pb-6 flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-card border border-border shadow-sm flex items-center justify-center shrink-0">
                <Icon className="w-6 h-6 text-rust" />
            </div>
            <div>
                <h2 className="text-3xl font-serif font-bold text-card-foreground tracking-tight">{title}</h2>
                <p className="text-muted-foreground mt-1 font-medium tracking-wide">{subtitle}</p>
            </div>
        </div>
    );
}
