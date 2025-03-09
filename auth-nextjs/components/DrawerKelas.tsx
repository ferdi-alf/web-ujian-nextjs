import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import { TablePagination } from "@mui/material";
import { AnimatedGradientText } from "./magicui/animated-gradient-text";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import FrameHasilSiswa from "./dialog/FrameHasilSiswa";

interface DrawerKelasProps {
  ujian: {
    tingkat: string;
    pelajaran: string;
    kelas?: {
      id: string;
      tingkat: string;
      jurusan: string;
      siswa: [];
    }[];
  };
}

const DrawerKelas: React.FC<DrawerKelasProps> = ({ ujian }) => {
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(5);
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button className="bg-blue-500">Details</Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full p-4 overflow-auto">
          <DrawerHeader>
            <DrawerTitle>Data Kelas untuk Ujian</DrawerTitle>
            <DrawerDescription>
              Daftar kelas untuk ujian {ujian.tingkat} - {ujian.pelajaran}
            </DrawerDescription>
          </DrawerHeader>

          <Paper>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell align="center">No</TableCell>
                    <TableCell align="center">Kelas</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ujian.kelas && ujian.kelas.length > 0 ? (
                    ujian.kelas
                      .slice(
                        page * rowsPerPage,
                        page * rowsPerPage + rowsPerPage
                      )
                      .map((kelas, index) => (
                        // Pastikan key ini unik untuk setiap item
                        <TableRow key={`kelas-${kelas.id}-${index}`}>
                          <TableCell align="center">{index + 1}</TableCell>
                          <TableCell align="center">
                            {kelas.tingkat} - {kelas.jurusan}
                          </TableCell>
                          <TableCell align="center">
                            <FrameHasilSiswa
                              tingkat={kelas.tingkat}
                              jurusan={kelas.jurusan}
                              siswa={kelas.siswa}
                            />
                          </TableCell>
                        </TableRow>
                      ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} align="center">
                        Tidak ada data kelas
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={ujian.kelas?.length || 0}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
            />
          </Paper>

          <DrawerFooter className="mt-4 p-0">
            <div className="group relative mx-auto flex items-center justify-center rounded-full px-4 py-1.5 shadow-[inset_0_-8px_10px_#8fdfff1f] transition-shadow duration-500 ease-out hover:shadow-[inset_0_-5px_10px_#8fdfff3f] ">
              <span
                className={cn(
                  "absolute inset-0 block h-full w-full animate-gradient rounded-[inherit] bg-gradient-to-r from-[#ffaa40]/50 via-[#9c40ff]/50 to-[#ffaa40]/50 bg-[length:300%_100%] p-[1px]"
                )}
                style={{
                  WebkitMask:
                    "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                  WebkitMaskComposite: "destination-out",
                  mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                  maskComposite: "subtract",
                  WebkitClipPath: "padding-box",
                }}
              />
              🎉 <hr className="mx-2 h-4 w-px shrink-0 bg-neutral-500" />
              <AnimatedGradientText className="text-sm font-medium">
                IDibuat Dengan ❤️ oleh @eternalferr_
              </AnimatedGradientText>
              <ChevronRight
                className="ml-1 size-4 stroke-neutral-500 transition-transform
 duration-300 ease-in-out group-hover:translate-x-0.5"
              />
            </div>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default DrawerKelas;
