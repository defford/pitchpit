"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SectionRail } from "@/components/terminal/section-rail";
import type { FaqItem } from "@/lib/data/company-guide";
import { padRank } from "@/lib/format";

type FaqSheetProps = {
  items: FaqItem[];
};

export function FaqSheet({ items }: FaqSheetProps) {
  return (
    <section
      id="faq"
      className="module scroll-mt-20"
      aria-labelledby="faq-title"
    >
      <div className="px-4 pt-4 sm:px-5 sm:pt-5">
        <SectionRail
          kicker="SHEET / COMPANIES"
          title="FAQ"
          titleId="faq-title"
          aside={
            <p className="font-data text-[10px] tracking-[0.14em] text-muted-foreground">
              TAP A LINE TO OPEN
            </p>
          }
        />
      </div>
      <Accordion
        type="multiple"
        className="border-t border-border px-4 sm:px-5"
      >
        {items.map((item, index) => (
          <AccordionItem
            key={item.id}
            value={item.id}
            className="border-border not-last:border-b"
          >
            <AccordionTrigger className="rounded-none py-4 text-left text-sm font-medium tracking-wide text-foreground hover:no-underline hover:text-signal">
              <span className="flex min-w-0 items-start gap-3 pr-3">
                <span className="font-data mt-0.5 shrink-0 text-[10px] tracking-[0.16em] text-muted-foreground">
                  {padRank(index + 1)}
                </span>
                <span>{item.question}</span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-silver">
              <p className="pl-8 leading-relaxed">{item.answer}</p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
