import { useEffect, useState } from 'react';
import { AppConfig, Titulo } from '@/types/titulo';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PromissoriaTab } from './PromissoriaTab';
import { CadernoTab } from './CadernoTab';

interface Props {
  config: AppConfig;
  titulos?: Titulo[];
  onAddTitulos?: (titulos: Omit<Titulo, 'id' | 'numero'>[]) => void;
}

export function PromissoriaTabs({ config, titulos = [], onAddTitulos }: Props) {
  const [sub, setSub] = useState('promissoria');

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('avatar-subtab', { detail: { tab: 'promissoria', sub } }));
  }, [sub]);

  return (
    <Tabs value={sub} onValueChange={setSub} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="promissoria" className="text-xs">📄 Promissória</TabsTrigger>
        <TabsTrigger value="caderno" className="text-xs">📓 Lançamento Caderno</TabsTrigger>
      </TabsList>
      <TabsContent value="promissoria" className="mt-4">
        <PromissoriaTab config={config} titulos={titulos} onAddTitulos={onAddTitulos} />
      </TabsContent>
      <TabsContent value="caderno" className="mt-4">
        <CadernoTab config={config} titulos={titulos} onAddTitulos={onAddTitulos} />
      </TabsContent>
    </Tabs>
  );
}
