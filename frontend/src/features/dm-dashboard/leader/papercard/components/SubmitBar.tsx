import { Button } from "@/components/ui/Button";
import { IconCheck } from "@/components/ui/icons";

interface Props {
  done: number;
  total: number;
  complete: boolean;
  submitted: boolean;
  onSubmit: () => void;
}

/** Fixed bottom bar spanning the whole page width. Kirim stays disabled until every item (and NG detail) is complete. */
export function SubmitBar({ done, total, complete, submitted, onSubmit }: Props) {
  return (
    <div className="dml-submitbar">
      <div className="dml-submitbar__inner">
        <div>
          <strong>
            {done}/{total} selesai
          </strong>
          <p>
            {submitted
              ? "Papercard sudah dikirim."
              : complete
                ? "Semua item sudah terisi. Siap dikirim."
                : "Lengkapi semua jawaban dan detail wajib."}
          </p>
        </div>
        {!submitted && (
          <Button variant="primary" size="lg" disabled={!complete} onClick={onSubmit}>
            <IconCheck size={18} /> Kirim
          </Button>
        )}
      </div>
    </div>
  );
}
