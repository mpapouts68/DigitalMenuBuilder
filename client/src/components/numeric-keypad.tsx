import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Delete, Eye, EyeOff } from 'lucide-react';

interface NumericKeypadProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  showValue?: boolean;
  onToggleVisibility?: () => void;
  onEnter?: () => void;
}

export function NumericKeypad({ 
  value, 
  onChange, 
  maxLength = 6, 
  showValue = false,
  onToggleVisibility,
  onEnter 
}: NumericKeypadProps) {
  const handleNumberClick = (num: string) => {
    if (value.length < maxLength) {
      onChange(value + num);
    }
  };

  const handleClear = () => {
    onChange('');
  };

  const handleBackspace = () => {
    onChange(value.slice(0, -1));
  };

  const handleEnterKey = () => {
    if (onEnter && value.length > 0) {
      onEnter();
    }
  };

  const displayValue = showValue ? value : '•'.repeat(value.length);

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* PIN Display */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-center">
                <div className="text-2xl font-mono tracking-widest min-h-[2rem] flex items-center justify-center">
                  {displayValue || <span className="text-gray-400">Enter PIN</span>}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {value.length}/{maxLength} digits
                </div>
              </div>
            </div>
            {onToggleVisibility && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleVisibility}
                className="ml-2"
              >
                {showValue ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Numeric Keypad */}
      <div className="grid grid-cols-3 gap-3">
        {/* Numbers 1-9 */}
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <Button
            key={num}
            variant="outline"
            size="lg"
            className="h-16 text-xl font-semibold hover:bg-blue-50 active:bg-blue-100 transition-colors"
            onClick={() => handleNumberClick(num.toString())}
          >
            {num}
          </Button>
        ))}

        {/* Bottom row: Clear, 0, Backspace */}
        <Button
          variant="outline"
          size="lg"
          className="h-16 text-lg font-medium hover:bg-red-50 active:bg-red-100 transition-colors"
          onClick={handleClear}
        >
          Clear
        </Button>
        
        <Button
          variant="outline"
          size="lg"
          className="h-16 text-xl font-semibold hover:bg-blue-50 active:bg-blue-100 transition-colors"
          onClick={() => handleNumberClick('0')}
        >
          0
        </Button>
        
        <Button
          variant="outline"
          size="lg"
          className="h-16 hover:bg-gray-50 active:bg-gray-100 transition-colors"
          onClick={handleBackspace}
        >
          <Delete className="w-6 h-6" />
        </Button>
      </div>

      {/* Enter Button */}
      {onEnter && (
        <Button
          className="w-full mt-4 h-12 text-lg font-semibold"
          onClick={handleEnterKey}
          disabled={value.length === 0}
        >
          Enter PIN
        </Button>
      )}
    </div>
  );
}