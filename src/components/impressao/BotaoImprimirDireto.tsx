/**
 * BotaoImprimirDireto — botão que gera o PDF do documento e o envia
 * diretamente para a impressora padrão do sistema (via PrintService),
 * sem exibir preview ou diálogo intermediário.
 */
import { useState } from 'react';
import { Printer, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button, ButtonProps } from '@/components/ui/button';
import { printService, TipoImpressao, ImprimirDiretoOptions } from '@/lib/printing/printService';

interface BotaoImprimirDiretoProps {
  /** Título/descrição do documento exibido no PDF */
  titulo: string;
  /** Tipo de documento a imprimir */
  tipo: TipoImpressao;
  /** Dados necessários para montar o PDF (exceto tipo/titulo/copias, já informados via props) */
  dados: Omit<ImprimirDiretoOptions, 'tipo' | 'titulo' | 'copias'>;
  /** Número de cópias a imprimir (padrão: 1) */
  copias?: number;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  className?: string;
  disabled?: boolean;
  /** Callback opcional após impressão bem-sucedida */
  onSuccess?: () => void;
  /** Callback opcional após falha na impressão */
  onError?: (error: unknown) => void;
}

export function BotaoImprimirDireto({
  titulo,
  tipo,
  dados,
  copias = 1,
  variant = 'default',
  size = 'default',
  className,
  disabled,
  onSuccess,
  onError,
}: BotaoImprimirDiretoProps) {
  const [imprimindo, setImprimindo] = useState(false);

  const handleClick = async () => {
    if (imprimindo) return;
    setImprimindo(true);
    try {
      const sucesso = await printService.imprimirDireto({
        tipo,
        titulo,
        copias,
        ...dados,
      });
      if (sucesso) {
        toast.success('Documento enviado para impressora.');
        onSuccess?.();
      } else {
        toast.warning('Não foi possível enviar automaticamente. Verifique a janela aberta.');
      }
    } catch (err) {
      console.error('[BotaoImprimirDireto] erro ao imprimir', err);
      toast.error('Erro ao imprimir documento.');
      onError?.(err);
    } finally {
      setImprimindo(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      disabled={disabled || imprimindo}
      onClick={handleClick}
      title="Imprimir diretamente"
    >
      {imprimindo ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Printer className="h-4 w-4" />
      )}
      <span className="ml-1">{imprimindo ? 'Imprimindo...' : 'Imprimir'}</span>
    </Button>
  );
}
