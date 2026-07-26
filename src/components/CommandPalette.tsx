import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useGlobalSearch, SearchResult } from "@/hooks/useGlobalSearch";
import {
  FolderKanban,
  Crosshair,
  Users,
  Plane,
  Award,
  FileText,
  ClipboardList,
  Plus,
  Search,
} from "lucide-react";

const TYPE_ICONS: Record<SearchResult["type"], React.ElementType> = {
  project: FolderKanban,
  mission: Crosshair,
  client: Users,
  drone: Plane,
  pilot: Award,
  invoice: FileText,
  flight_log: ClipboardList,
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const { query, setQuery, grouped, loading, typeLabels } = useGlobalSearch();

  useEffect(() => {
    if (!open) setQuery("");
  }, [open, setQuery]);

  const go = (url: string) => {
    onOpenChange(false);
    navigate(url);
  };

  const quickActions = [
    { label: "Create Project", icon: FolderKanban, action: () => go("/projects?action=create") },
    { label: "Create Flight Log", icon: ClipboardList, action: () => go("/flight-logs?action=create") },
    { label: "Create Invoice", icon: FileText, action: () => go("/invoices?action=create") },
    { label: "Add Client", icon: Users, action: () => go("/clients?action=create") },
  ];

  const hasResults = Object.keys(grouped).length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 shadow-lg" aria-describedby={undefined}>
        <VisuallyHidden>
          <DialogTitle>Search and Quick Actions</DialogTitle>
        </VisuallyHidden>
        <Command
          shouldFilter={false}
          className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5"
        >
          <CommandInput
            placeholder="Search projects, missions, clients… or type a command"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {query.length < 2 && (
              <CommandGroup heading="Quick Actions">
                {quickActions.map((a) => (
                  <CommandItem key={a.label} onSelect={a.action}>
                    <Plus className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>{a.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {query.length >= 2 && !loading && !hasResults && (
              <CommandEmpty>No results found for "{query}"</CommandEmpty>
            )}

            {query.length >= 2 && loading && (
              <div className="py-6 text-center text-sm text-muted-foreground">Searching…</div>
            )}

            {query.length >= 2 &&
              !loading &&
              Object.entries(grouped).map(([type, items], idx) => {
                const Icon = TYPE_ICONS[type as SearchResult["type"]] || Search;
                const label = typeLabels[type as SearchResult["type"]] || type;
                return (
                  <div key={type}>
                    {idx > 0 && <CommandSeparator />}
                    <CommandGroup heading={label}>
                      {items.map((item) => (
                        <CommandItem key={item.id} onSelect={() => go(item.url)}>
                          <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span>{item.title}</span>
                          {item.subtitle && (
                            <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                              {item.subtitle}
                            </span>
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </div>
                );
              })}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
