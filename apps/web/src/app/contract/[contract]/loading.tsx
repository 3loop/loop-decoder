import { aaveV2 } from "@/app/data";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const LOADING_ROWS = Array.from(Array(5).keys());

export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="py-4 grid w-full max-w-sm items-center gap-1.5">
        <Label htmlFor="contractAddress">Contract address</Label>
        <Input
          disabled
          type="contractAddress"
          id="contractAddress"
          placeholder={`${aaveV2}`}
        />
      </div>
      <Separator />
      <Table>
        <TableCaption>A list of recent transactions.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="">Age</TableHead>
            <TableHead>Link</TableHead>
            <TableHead>Interpretation</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {LOADING_ROWS.map((key) => {
            return (
              <TableRow key={key}>
                <TableCell colSpan={1}>
                  <div className="flex flex-col h-6 w-48 rounded-md bg-muted animate-pulse"></div>
                </TableCell>
                <TableCell colSpan={1}>
                  <div className="flex flex-col h-6 w-48 rounded-md bg-muted animate-pulse"></div>
                </TableCell>
                <TableCell colSpan={1}>
                  <div className="flex flex-col h-16 flex-1 rounded-md bg-muted animate-pulse"></div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
