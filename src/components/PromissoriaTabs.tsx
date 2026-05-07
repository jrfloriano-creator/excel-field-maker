import { AppConfig, Titulo } from '@/types/titulo';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PromissoriaTab } from './PromissoriaTab';
import { CadernoTab } from './CadernoTab';

interface Props {
  config: AppConfig;
  onAddTitulos?: (titulos: Omit<Titulo, 'id' | 'numero'>[]) => void;
}

export function PromissoriaTabs({ config, onAddTitulos }: Props) {
  return (
    <Tabs defaultValue="promissoria" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="promissoria" className="text-xs">📄 Promissória</TabsTrigger>
        <TabsTrigger value="caderno" className="text-xs">📓 Lançamento Caderno</TabsTrigger>
      </TabsList>
      <TabsContent value="promissoria" className="mt-4">
        <PromissoriaTab config={config} onAddTitulos={onAddTitulos} />
      </TabsContent>
      <TabsContent value="caderno" className="mt-4">
        <CadernoTab config={config} onAddTitulos={onAddTitulos} />
      </TabsContent>
    </Tabs>
  );
}
