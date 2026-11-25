"use client";

import { apiClient } from "@/lib/api/client";
import { useMutation } from "@/lib/api/hooks";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useState } from "react";

type Payload = Record<string, unknown>;

export function BulkRequest({ books }: { books: string[] }) {
    const [done, setDone] = useState("");
    const [startedAt] = useState(() => Date.now());
    const { mutate, pending, fieldErrors, error } = useMutation(
        (body: Payload) => apiClient.post<{ message: string }>("/api/public/enquiries/bulk-books", body),
        { onSuccess: (result) => setDone(result.data.message) },
    );

    const err = (name: string) => fieldErrors[name];
    const input = (name: string, label: string, type = "text", extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
        <label key={name}>
            <span>{label} *</span>
            <input name={name} type={type} required maxLength={100} autoComplete="off" aria-invalid={Boolean(err(name))} {...extra} />
            {err(name) ? <small role="alert" className="web-field-error">{err(name)}</small> : null}
        </label>
    );

    return <div className="web-bulk">
        <div><p className="web-eyebrow">Reading together</p><h2>A place for<br /><em>publication enquiries.</em></h2><p>Ask about bulk copies of IBMV publications. The IBMV team will reply with availability and next steps. Payment is not taken on this page.</p></div>
        {done ? <p className="web-form-status" role="status"><CheckCircle2 size={19} aria-hidden="true" />{done}</p> : <form
            noValidate
            onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                const value = (name: string) => String(form.get(name) ?? "");
                void mutate({
                    firstName: value("firstName"), lastName: value("lastName"), email: value("email"), countryCode: value("countryCode"),
                    mobile: value("mobile"), city: value("city"), pincode: value("pincode"), address: value("address"), book: value("book"),
                    quantity: Number(value("quantity")), consent: form.get("consent") === "on", website: value("website"), startedAt,
                });
            }}
        >
            <div className="web-form-grid">
                {input("firstName", "First name")}
                {input("lastName", "Last name")}
                {input("email", "Email", "email")}
                {input("countryCode", "Country code", "text", { defaultValue: "+91", maxLength: 5, inputMode: "tel" })}
                {input("mobile", "Mobile number", "tel", { inputMode: "tel", maxLength: 15 })}
                {input("city", "City")}
                {input("pincode", "Postal code", "text", { maxLength: 10 })}
                <label className="web-form-wide"><span>Address *</span><textarea name="address" required maxLength={300} rows={2} aria-invalid={Boolean(err("address"))} />{err("address") ? <small role="alert" className="web-field-error">{err("address")}</small> : null}</label>
                <label><span>Publication *</span><select name="book" required defaultValue="" aria-invalid={Boolean(err("book"))}><option value="" disabled>Choose a publication</option>{books.map((title) => <option key={title}>{title}</option>)}</select>{err("book") ? <small role="alert" className="web-field-error">{err("book")}</small> : null}</label>
                <label><span>Quantity *</span><input name="quantity" type="number" min={1} max={1000} required defaultValue={10} aria-invalid={Boolean(err("quantity"))} />{err("quantity") ? <small role="alert" className="web-field-error">{err("quantity")}</small> : null}</label>
                <label className="web-form-wide web-consent"><input name="consent" type="checkbox" required aria-invalid={Boolean(err("consent"))} /><span>I agree that IBMV may contact me about this request. *</span>{err("consent") ? <small role="alert" className="web-field-error">{err("consent")}</small> : null}</label>
                <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}><label>Leave this field empty<input name="website" tabIndex={-1} autoComplete="off" defaultValue="" /></label></div>
            </div>
            {error && Object.keys(fieldErrors).length === 0 ? <p className="web-form-note" role="alert">{error.message}</p> : null}
            <p className="web-form-note">Your details are used only to reply to this request.</p>
            <button className="web-btn" type="submit" disabled={pending}>{pending ? "Sending…" : "Send enquiry"}<ArrowRight size={16} aria-hidden="true" /></button>
        </form>}
    </div>;
}
