import { Card, CardContent } from "@/components/ui/card";

export function ComingSoon({ skill }: { skill: string }) {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <Card className="max-w-md">
        <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
          <h1 className="text-xl font-semibold">{skill}</h1>
          <p className="text-sm text-muted-foreground">Coming soon.</p>
        </CardContent>
      </Card>
    </div>
  );
}
