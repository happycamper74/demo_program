interface PhoneInstructionsProps {
  phoneNumber: string;
  message: string;
}

export function PhoneInstructions({ phoneNumber, message }: PhoneInstructionsProps) {
  return (
    <div className="stack">
      <p>{message}</p>
      <p className="phone-number" aria-label="Shared demo phone number">
        {phoneNumber}
      </p>
      <p className="muted">
        Call from the phone number you registered during qualification. Calls from other numbers
        will not be matched to your demo session.
      </p>
    </div>
  );
}
