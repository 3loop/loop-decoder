import { Label } from "@/components/ui/label";
import { SidebarNav } from "@/components/ui/sidebar-nav";
import { sidebarNavItems } from "./form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Loading() {
  return (
    <div className="grid h-full items-stretch gap-6 md:grid-cols-[1fr_200px]">
      <div className="md:order-1">
        <div className="flex-col space-y-4 flex md:order-2">
          <div className="flex flex-col space-y-4">
            <div className="grid h-full gap-6 lg:grid-cols-2">
              <div className="flex flex-col space-y-4">
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="transactionHash">Transaction</Label>
                  <form>
                    <div className="flex w-full items-center space-x-2">
                      <Input className="flex-1 flex" id="hash" name="hash" />
                      <Button type="submit">Decode</Button>
                    </div>
                  </form>
                </div>

                <div className="flex flex-1 flex-col space-y-2 min-h-[250px]">
                  <Label htmlFor="input">Decoded transaction</Label>
                  <div className="flex flex-1 animate-pulse bg-muted rounded-md"></div>
                </div>
                <div className="flex flex-1 flex-col space-y-2 min-h-[250px]">
                  <div className="flex flex-row">
                    <Label htmlFor="intepretation">
                      Intepretation (JSONata syntax)
                    </Label>
                  </div>
                  <div className="flex flex-1 animate-pulse bg-muted rounded-md"></div>
                </div>
              </div>
              <div className="mt-[21px] min-h-[400px] rounded-md border bg-muted lg:min-h-[700px] overflow-scroll animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>

      <div className=" md:order-2">
        <div className="space-y-4">
          <div className="pl-4">
            <h2 className="text-lg font-semibold tracking-tight">AAVE V2</h2>
            <p className="text-sm text-muted-foreground">
              Example Transactions
            </p>
          </div>
          <SidebarNav items={sidebarNavItems} />
        </div>
      </div>
    </div>
  );
}
