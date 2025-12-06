import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { LucideIcon } from 'lucide-react'

export default function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description: string
}) {
  return (
    <Card className="h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-lg border-2 hover:border-primary/20 bg-gradient-to-br from-background to-muted/30 group">
      <CardHeader className="space-y-4">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-primary/10 p-3 text-primary transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110">
            <Icon size={24} />
          </div>
          <div className="flex-1 pt-1">
            <CardTitle className="text-lg mb-2 group-hover:text-primary transition-colors">
              {title}
            </CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              {description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
    </Card>
  )
}
