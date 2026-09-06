import LinkControlApp from "@/components/LinkControlApp";
import Ficha360QuickAccess from "@/components/Ficha360QuickAccess";
import PersonalMissionMenuLink from "@/components/PersonalMissionMenuLink";

export default function Home() {
  return (
    <>
      <LinkControlApp />
      <PersonalMissionMenuLink />
      <Ficha360QuickAccess />
    </>
  );
}
