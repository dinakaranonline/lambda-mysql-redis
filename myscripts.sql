use actors

show tables;

CREATE TABLE `actors` (
  `id` int(11) NOT NULL,
  `hero` varchar(45) DEFAULT NULL,
  `name` varchar(45) DEFAULT NULL,
  `power` varchar(45) DEFAULT NULL,
  `color` varchar(45) DEFAULT NULL,
  `xp` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
);

select * from actors;


insert into actors values(1,"yes","fireman","fire","red",10);
insert into actors values(2,"no","dogman","bark","brown",50);
insert into actors values(3,"no","bananaman","eat","yellow",30);
insert into actors values(4,"yes","spiderman","fly","red",45);
insert into actors values(5,"no","goatman","jump","white",33);
insert into actors values(6,"maybe","brave","fight","blue",45);
insert into actors values(7,"no","cinderella","wash","pink",12);
insert into actors values(8,"no","elisa","freeze","white",34);
insert into actors values(9,"yes","robinhood","steal","green",67);
insert into actors values(10,"no","gandalf","think","grey",86);
insert into actors values(11,"no","catman","run","brown",84);
insert into actors values(12,"no","dogman","catch","brown",47);

insert into actors values(13,"yes","fireman","fire","red",10);
insert into actors values(14,"no","dogman","bark","brown",50);
insert into actors values(15,"no","bananaman","eat","yellow",30);
insert into actors values(16,"yes","fireman","fire","red",10);
insert into actors values(17,"no","dogman","bark","brown",50);
insert into actors values(18,"no","bananaman","eat","yellow",30);
insert into actors values(19,"yes","fireman","fire","red",10);
insert into actors values(20,"no","dogman","bark","brown",50);
insert into actors values(21,"no","bananaman","eat","yellow",30);
insert into actors values(22,"no","bananaman","eat","yellow",30);
insert into actors values(23,"yes","fireman","fire","red",10);
insert into actors values(24,"no","dogman","bark","brown",50);
insert into actors values(25,"no","bananaman","eat","yellow",30);



11	no	run	catman	84	brown
12	no	catch	dogman	47	brown
13	maybe	stink	eggman	58	white
14	maybe	swim	fishman	58	blue
15	no	fly	birdman	2	grey
16	no	fly	flyman	32	black
17	no	stay	sofaman	77	red
18	maybe	scream	beast	33	brown
19	no	hide	goblin	67	green
20	yes	smile	charming	97	white
21	yes	stink	shrek	32	green
22	no	eat	appleman	25	red
23	maybe	grow	spinachman	65	green
24	no	hide	antman	37	black
25	yes	steal	mouseman	76	grey


id
hero
name
color
power
xp
